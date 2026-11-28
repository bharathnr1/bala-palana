import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { academicYearOf } from "@/lib/academic-year";
import { todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { admission, admissionEvent, appUser, child, enrolment, lookup } from "@/server/db/schema";
import { listChildTimeline } from "@/server/entries/timeline";
import { resetDatabase } from "../../../tests/db/helpers";

import { convertToStudent, createEnquiry, type ConvertToStudentInput } from "./mutations";
import { getAdmissionForChild } from "./queries";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

let userCount = 0;

async function makeUser(role: SessionUser["role"]): Promise<SessionUser> {
  userCount += 1;
  const email = `${role}-${userCount}@example.com`;
  const name = `TEST ${role} ${userCount}`;
  const [row] = await getDb()
    .insert(appUser)
    .values({ email, name, role })
    .returning({ id: appUser.id });
  if (!row) throw new Error("insert failed");
  return { id: row.id, name, email, role };
}

async function lookupId(kind: string, key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key)))
    .limit(1);
  if (!row) throw new Error(`missing lookup ${kind}.${key}`);
  return row.id;
}

async function currentStatusKey(admissionId: string): Promise<string> {
  const [row] = await getDb()
    .select({ key: lookup.key })
    .from(admission)
    .innerJoin(lookup, eq(lookup.id, admission.statusId))
    .where(eq(admission.id, admissionId));
  return row?.key ?? "";
}

function conversion(
  admissionId: string,
  overrides: Partial<ConvertToStudentInput> = {},
): ConvertToStudentInput {
  return { admissionId, consent: true, joinedOn: "2026-06-10", gradeKey: "grade_1", ...overrides };
}

describe("convertToStudent", () => {
  it("rejects the conversion when consent is missing and writes nothing", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await expect(
      convertToStudent(coordinator, conversion(saved.admissionId, { consent: false })),
    ).rejects.toThrow(strings.admissions.errors.consent);

    const [applicant] = await getDb()
      .select({ stage: child.stage, joinedOn: child.joinedOn, consentGivenAt: child.consentGivenAt })
      .from(child)
      .where(eq(child.id, saved.childId));
    expect(applicant).toEqual({ stage: "applicant", joinedOn: null, consentGivenAt: null });

    const enrolments = await getDb()
      .select({ id: enrolment.id })
      .from(enrolment)
      .where(eq(enrolment.childId, saved.childId));
    expect(enrolments).toHaveLength(0);
    expect(await currentStatusKey(saved.admissionId)).toBe("application_received");
  });

  it("moves the child to student, records the enrolment and closes the admission", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await convertToStudent(
      coordinator,
      conversion(saved.admissionId, { outsideSchool: "TEST Outside School" }),
    );

    const [student] = await getDb()
      .select({ stage: child.stage, joinedOn: child.joinedOn, consentGivenAt: child.consentGivenAt })
      .from(child)
      .where(eq(child.id, saved.childId));
    expect(student?.stage).toBe("student");
    expect(student?.joinedOn).toBe("2026-06-10");
    expect(student?.consentGivenAt).toBeInstanceOf(Date);

    const [row] = await getDb()
      .select({
        academicYear: enrolment.academicYear,
        gradeId: enrolment.gradeId,
        outsideSchool: enrolment.outsideSchool,
      })
      .from(enrolment)
      .where(eq(enrolment.childId, saved.childId));
    // The academic year comes from the setting's start month (June by default).
    expect(row?.academicYear).toBe(academicYearOf("2026-06-10"));
    expect(row?.gradeId).toBe(await lookupId("grade", "grade_1"));
    expect(row?.outsideSchool).toBe("TEST Outside School");

    const statusId = await lookupId("admission_status", "selected_as_student");
    expect(await currentStatusKey(saved.admissionId)).toBe("selected_as_student");

    const [converted] = await getDb()
      .select({
        kind: admissionEvent.kind,
        statusId: admissionEvent.statusId,
        occurredOn: admissionEvent.occurredOn,
      })
      .from(admissionEvent)
      .where(
        and(
          eq(admissionEvent.admissionId, saved.admissionId),
          eq(admissionEvent.statusId, statusId),
        ),
      );
    expect(converted).toMatchObject({
      kind: "status_change",
      occurredOn: "2026-06-10",
    });
  });

  it("accepts consent already on file without ticking the box again", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await getDb()
      .update(child)
      .set({ consentGivenAt: new Date() })
      .where(eq(child.id, saved.childId));

    await convertToStudent(coordinator, conversion(saved.admissionId, { consent: false }));

    const [student] = await getDb()
      .select({ stage: child.stage })
      .from(child)
      .where(eq(child.id, saved.childId));
    expect(student?.stage).toBe("student");
  });

  it("refuses to convert a child who is no longer an applicant", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await convertToStudent(coordinator, conversion(saved.admissionId));

    await expect(
      convertToStudent(coordinator, conversion(saved.admissionId)),
    ).rejects.toThrow(strings.admissions.errors.notApplicant);
  });

  it("refuses management and teachers", async () => {
    const coordinator = await makeUser("coordinator");
    const management = await makeUser("management");
    const teacher = await makeUser("teacher");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await expect(
      convertToStudent(management, conversion(saved.admissionId)),
    ).rejects.toThrow("admission.write");
    await expect(
      convertToStudent(teacher, conversion(saved.admissionId)),
    ).rejects.toThrow("admission.write");
  });
});

describe("after conversion", () => {
  it("the Admission tab query returns the closed record and its history", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });
    await convertToStudent(coordinator, conversion(saved.admissionId));

    const detail = await getAdmissionForChild(coordinator, saved.childId);
    expect(detail).toMatchObject({
      id: saved.admissionId,
      childId: saved.childId,
      stage: "student",
      statusKey: "selected_as_student",
      isTerminal: true,
      joinedOn: "2026-06-10",
    });
    expect(detail?.consentGivenAt).toBeInstanceOf(Date);
    expect(detail?.events.map((event) => event.kind)).toContain("status_change");
  });

  it("the admission events still reach the Journey timeline", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, {
      fullName: "TEST Applicant",
      enquiryOn: "2026-05-01",
    });
    await convertToStudent(coordinator, conversion(saved.admissionId));

    const timeline = await listChildTimeline(coordinator, saved.childId);
    const admissionEvents = timeline.events.filter((event) => event.kind === "admission");
    expect(admissionEvents.length).toBeGreaterThan(0);
    expect(timeline.events.some((event) => event.kind === "enrolment")).toBe(true);
  });

  it("does not reach a teacher's Journey", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const saved = await createEnquiry(coordinator, {
      fullName: "TEST Applicant",
      enquiryOn: todayISO(),
    });
    await convertToStudent(coordinator, conversion(saved.admissionId));

    const timeline = await listChildTimeline(teacher, saved.childId);
    expect(timeline.events.some((event) => event.kind === "admission")).toBe(false);
  });
});
