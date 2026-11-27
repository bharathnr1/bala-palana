import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { addDaysISO, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import {
  admission,
  admissionEvent,
  appUser,
  child,
  childGuardian,
  guardian,
  lookup,
} from "@/server/db/schema";
import { listChildTimeline } from "@/server/entries/timeline";
import { listOpenFollowUps } from "@/server/follow-ups/queries";
import { resetDatabase } from "../../../tests/db/helpers";

import {
  addEvent,
  changeStatus,
  createEnquiry,
  setNextAction,
  type CreateEnquiryInput,
} from "./mutations";
import { admissionFunnel, admissionOptions } from "./queries";

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

function enquiry(overrides: Partial<CreateEnquiryInput> = {}): CreateEnquiryInput {
  return { fullName: "TEST Applicant", ...overrides };
}

describe("createEnquiry", () => {
  it("creates the applicant, the guardian and the admission in one go", async () => {
    const coordinator = await makeUser("coordinator");

    const saved = await createEnquiry(
      coordinator,
      enquiry({
        dob: "2016-04-12",
        guardianName: "TEST Guardian",
        guardianPhone: "9000000000",
        relationKey: "mother",
        sourceKey: "word_of_mouth",
      }),
    );

    const [applicant] = await getDb().select().from(child).where(eq(child.id, saved.childId));
    expect(applicant?.stage).toBe("applicant");
    expect(applicant?.fullName).toBe("TEST Applicant");

    const [row] = await getDb()
      .select({
        statusKey: lookup.key,
        sourceKey: sql<string>`(select key from lookup where id = ${admission.sourceId})`,
        assignedTo: admission.assignedTo,
        enquiryOn: admission.enquiryOn,
      })
      .from(admission)
      .innerJoin(lookup, eq(lookup.id, admission.statusId))
      .where(eq(admission.id, saved.admissionId));
    expect(row?.statusKey).toBe("application_received");
    expect(row?.sourceKey).toBe("word_of_mouth");
    expect(row?.assignedTo).toBe(coordinator.id);
    expect(row?.enquiryOn).toBe(todayISO());

    const links = await getDb()
      .select({ guardianId: childGuardian.guardianId, relationId: childGuardian.relationId })
      .from(childGuardian)
      .where(eq(childGuardian.childId, saved.childId));
    expect(links).toHaveLength(1);
    const [parent] = await getDb()
      .select({ name: guardian.name, phone: guardian.phone })
      .from(guardian)
      .where(eq(guardian.id, links[0]?.guardianId ?? ""));
    expect(parent).toEqual({ name: "TEST Guardian", phone: "9000000000" });
    expect(links[0]?.relationId).toBe(await lookupId("relation", "mother"));

    const events = await getDb()
      .select()
      .from(admissionEvent)
      .where(eq(admissionEvent.admissionId, saved.admissionId));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "status_change",
      occurredOn: todayISO(),
      statusId: await lookupId("admission_status", "application_received"),
      authorId: coordinator.id,
    });
  });

  it("records the stage it was created in when it is not the default", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry({ statusKey: "follow_up_later" }));

    const [event] = await getDb()
      .select()
      .from(admissionEvent)
      .where(eq(admissionEvent.admissionId, saved.admissionId));
    expect(event).toMatchObject({
      kind: "status_change",
      statusId: await lookupId("admission_status", "follow_up_later"),
    });
  });

  it("lets a coordinator write but not management or a teacher", async () => {
    const management = await makeUser("management");
    const teacher = await makeUser("teacher");

    await expect(createEnquiry(management, enquiry())).rejects.toThrow("admission.write");
    await expect(createEnquiry(teacher, enquiry())).rejects.toThrow("admission.write");
  });
});

describe("changeStatus", () => {
  it("always logs a status_change event with the new stage and the author", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry());

    await changeStatus(coordinator, {
      admissionId: saved.admissionId,
      statusKey: "invited",
      occurredOn: "2026-11-20",
      note: "Interview went well",
    });

    const [row] = await getDb()
      .select({ statusKey: lookup.key })
      .from(admission)
      .innerJoin(lookup, eq(lookup.id, admission.statusId))
      .where(eq(admission.id, saved.admissionId));
    expect(row?.statusKey).toBe("invited");

    const events = await getDb()
      .select()
      .from(admissionEvent)
      .where(eq(admissionEvent.admissionId, saved.admissionId));
    // The first stage was logged at creation; the change adds the second.
    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.occurredOn === "2026-11-20")).toEqual([
      expect.objectContaining({
        kind: "status_change",
        statusId: await lookupId("admission_status", "invited"),
        note: "Interview went well",
        authorId: coordinator.id,
      }),
    ]);
  });

  it("keeps the stage when the stage is unknown", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry());

    await expect(
      changeStatus(coordinator, { admissionId: saved.admissionId, statusKey: "no_such_stage" }),
    ).rejects.toThrow("stage");

    const [row] = await getDb()
      .select({ statusKey: lookup.key })
      .from(admission)
      .innerJoin(lookup, eq(lookup.id, admission.statusId))
      .where(eq(admission.id, saved.admissionId));
    expect(row?.statusKey).toBe("application_received");
    const events = await getDb()
      .select()
      .from(admissionEvent)
      .where(eq(admissionEvent.admissionId, saved.admissionId));
    // Only the event written at creation; the rejected change wrote none.
    expect(events).toHaveLength(1);
  });

  it("refuses a reader without admission.write", async () => {
    const coordinator = await makeUser("coordinator");
    const management = await makeUser("management");
    const saved = await createEnquiry(coordinator, enquiry());

    await expect(
      changeStatus(management, { admissionId: saved.admissionId, statusKey: "invited" }),
    ).rejects.toThrow("admission.write");
  });
});

describe("addEvent", () => {
  it("records the event and keeps the latest interview date on the admission", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry());

    await addEvent(coordinator, {
      admissionId: saved.admissionId,
      kind: "interview",
      occurredOn: "2026-11-18",
      note: "Came with her mother",
    });

    const [row] = await getDb().select().from(admission).where(eq(admission.id, saved.admissionId));
    expect(row?.interviewOn).toBe("2026-11-18");
    const [event] = await getDb()
      .select()
      .from(admissionEvent)
      .where(
        and(
          eq(admissionEvent.admissionId, saved.admissionId),
          eq(admissionEvent.kind, "interview"),
        ),
      );
    expect(event).toMatchObject({ kind: "interview", occurredOn: "2026-11-18", statusId: null });
  });

  it("does not move the interview date backwards for a backfilled interview", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry());

    await addEvent(coordinator, {
      admissionId: saved.admissionId,
      kind: "interview",
      occurredOn: "2026-11-20",
    });
    await addEvent(coordinator, {
      admissionId: saved.admissionId,
      kind: "interview",
      occurredOn: "2026-11-10",
    });

    const [row] = await getDb().select().from(admission).where(eq(admission.id, saved.admissionId));
    expect(row?.interviewOn).toBe("2026-11-20");
  });
});

describe("setNextAction", () => {
  it("puts the admission on the assignee's Home follow-ups and nowhere else", async () => {
    const coordinator = await makeUser("coordinator");
    const other = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry({ fullName: "TEST Follow" }));

    await setNextAction(coordinator, {
      admissionId: saved.admissionId,
      nextAction: "Call the family",
      followUpOn: "2026-11-30",
      assignedTo: other.id,
    });

    const mine = await listOpenFollowUps(other, { mine: true });
    expect(mine.rows).toHaveLength(1);
    expect(mine.rows[0]).toMatchObject({
      kind: "admission",
      admissionId: saved.admissionId,
      childName: "TEST Follow",
      categoryKey: "admission",
      categoryLabel: "Application received",
      note: "Call the family",
      followUpOn: "2026-11-30",
    });

    const creators = await listOpenFollowUps(coordinator, { mine: true });
    expect(creators.rows).toHaveLength(0);
  });

  it("gives a follow-up date without an assignee to the person setting it", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry());

    await setNextAction(coordinator, {
      admissionId: saved.admissionId,
      nextAction: "Call the family",
      followUpOn: "2026-11-30",
    });

    const [row] = await getDb().select().from(admission).where(eq(admission.id, saved.admissionId));
    expect(row?.assignedTo).toBe(coordinator.id);
    expect((await listOpenFollowUps(coordinator, { mine: true })).rows).toHaveLength(1);
  });

  it("clears the follow-up when the fields are blank", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, enquiry({ followUpOn: "2026-11-30" }));

    await setNextAction(coordinator, { admissionId: saved.admissionId });

    const [row] = await getDb().select().from(admission).where(eq(admission.id, saved.admissionId));
    expect(row?.followUpOn).toBeNull();
    expect(row?.assignedTo).toBeNull();
    expect((await listOpenFollowUps(coordinator, { mine: true })).rows).toHaveLength(0);
  });

  it("never shows an admission follow-up to a teacher", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    await createEnquiry(
      coordinator,
      enquiry({ nextAction: "Call", followUpOn: "2026-11-30", assignedTo: coordinator.id }),
    );

    expect((await listOpenFollowUps(teacher, { mine: true })).rows).toHaveLength(0);
    expect((await listOpenFollowUps(teacher)).rows).toHaveLength(0);
  });

  it("refuses to assign an enquiry to someone who cannot work on it", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const saved = await createEnquiry(coordinator, enquiry());

    await expect(
      setNextAction(coordinator, { admissionId: saved.admissionId, assignedTo: teacher.id }),
    ).rejects.toThrow(strings.admissions.errors.assigneeUnknown);
    await expect(createEnquiry(coordinator, enquiry({ assignedTo: teacher.id }))).rejects.toThrow(
      strings.admissions.errors.assigneeUnknown,
    );
  });

  it("leaves a terminal stage out of the open follow-ups", async () => {
    const coordinator = await makeUser("coordinator");
    await createEnquiry(
      coordinator,
      enquiry({ statusKey: "not_interested", followUpOn: "2026-11-30" }),
    );

    expect((await listOpenFollowUps(coordinator, { mine: true })).rows).toHaveLength(0);
  });
});

describe("timeline and funnel", () => {
  it("shows admission events to a coordinator but not to a teacher", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const saved = await createEnquiry(coordinator, enquiry());
    await changeStatus(coordinator, {
      admissionId: saved.admissionId,
      statusKey: "selected_for_interview",
      occurredOn: "2026-11-19",
    });

    const staffPage = await listChildTimeline(coordinator, saved.childId);
    expect(
      staffPage.events.some(
        (event) => event.kind === "admission" && event.title.includes("Selected for interview"),
      ),
    ).toBe(true);

    const teacherPage = await listChildTimeline(teacher, saved.childId);
    expect(teacherPage.events.filter((event) => event.kind === "admission")).toHaveLength(0);
  });

  it("counts admissions per stage and the follow-ups due", async () => {
    const coordinator = await makeUser("coordinator");
    const yesterday = addDaysISO(todayISO(), -1);
    await createEnquiry(coordinator, enquiry({ fullName: "TEST One", followUpOn: yesterday }));
    await createEnquiry(coordinator, enquiry({ fullName: "TEST Two" }));
    await createEnquiry(
      coordinator,
      enquiry({ fullName: "TEST Three", statusKey: "invited", followUpOn: yesterday }),
    );

    const funnel = await admissionFunnel(coordinator);
    const received = funnel.find((row) => row.status === "Application received");
    const invited = funnel.find((row) => row.status === "Invited");
    const eligible = funnel.find((row) => row.status === "Not eligible");

    expect(received).toEqual({ status: "Application received", count: 2, followUpsDue: 1 });
    expect(invited).toEqual({ status: "Invited", count: 1, followUpsDue: 1 });
    expect(eligible).toEqual({ status: "Not eligible", count: 0, followUpsDue: 0 });
  });

  it("offers stages with their terminal flag and assignable staff only", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");

    const options = await admissionOptions(coordinator);
    expect(
      options.statuses.find((status) => status.key === "selected_as_student")?.isTerminal,
    ).toBe(true);
    expect(options.statuses.find((status) => status.key === "invited")?.isTerminal).toBe(false);
    expect(options.sources.map((source) => source.key)).toContain("word_of_mouth");
    expect(options.assignees.map((person) => person.id)).not.toContain(teacher.id);
  });

  it("refuses the options to a teacher", async () => {
    const teacher = await makeUser("teacher");
    await expect(admissionOptions(teacher)).rejects.toThrow("admission.read");
  });
});
