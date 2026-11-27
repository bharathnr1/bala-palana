import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { addEvent, changeStatus, createEnquiry } from "./mutations";
import { admissionBoard, admissionOptions, getAdmission } from "./queries";

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

describe("admissionBoard", () => {
  it("shows every active stage in stage order, including empty ones", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, {
      fullName: "TEST Applicant",
      enquiryOn: "2026-01-05",
    });

    const [options, board] = await Promise.all([
      admissionOptions(coordinator),
      admissionBoard(coordinator),
    ]);

    expect(board.columns.map((column) => column.key)).toEqual(
      options.statuses.map((status) => status.key),
    );

    const received = board.columns.find((column) => column.key === "application_received");
    expect(received).toMatchObject({ count: 1, isTerminal: false });
    expect(received?.rows).toHaveLength(1);
    expect(received?.rows[0]).toMatchObject({
      id: saved.admissionId,
      childId: saved.childId,
      childName: "TEST Applicant",
      statusKey: "application_received",
      enquiryOn: "2026-01-05",
      assignedToName: coordinator.name,
    });

    const empty = board.columns.find((column) => column.key === "invited");
    expect(empty).toMatchObject({ count: 0, rows: [] });

    const terminal = board.columns.find((column) => column.key === "selected_as_student");
    expect(terminal?.isTerminal).toBe(true);
    expect(board.hasMore).toBe(false);
  });

  it("moves the card to its new stage and marks a terminal stage", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await changeStatus(coordinator, {
      admissionId: saved.admissionId,
      statusKey: "selected_as_student",
      occurredOn: "2026-02-01",
    });

    const board = await admissionBoard(coordinator);
    const received = board.columns.find((column) => column.key === "application_received");
    const selected = board.columns.find((column) => column.key === "selected_as_student");

    expect(received?.count).toBe(0);
    expect(received?.rows).toHaveLength(0);
    expect(selected).toMatchObject({
      count: 1,
      isTerminal: true,
      rows: [{ id: saved.admissionId, statusKey: "selected_as_student" }],
    });
  });

  it("hides an anonymised child from the board", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await getDb().update(child).set({ anonymisedAt: new Date() }).where(eq(child.id, saved.childId));

    const board = await admissionBoard(coordinator);
    expect(board.columns.reduce((sum, column) => sum + column.count, 0)).toBe(0);
  });

  it("refuses a role without admission.read", async () => {
    const teacher = await makeUser("teacher");
    await expect(admissionBoard(teacher)).rejects.toThrow("admission.read");
  });
});

describe("getAdmission", () => {
  it("returns the child, the family and the events, newest first", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, {
      fullName: "TEST Applicant",
      dob: "2016-04-12",
      guardianName: "TEST Guardian",
      guardianPhone: "9000000000",
      relationKey: "mother",
      sourceKey: "word_of_mouth",
      enquiryOn: "2026-01-05",
    });

    await addEvent(coordinator, {
      admissionId: saved.admissionId,
      kind: "interview",
      occurredOn: "2026-01-10",
      note: "TEST interview note",
    });
    await changeStatus(coordinator, {
      admissionId: saved.admissionId,
      statusKey: "invited",
      occurredOn: "2026-02-01",
      note: "TEST invited",
    });

    const detail = await getAdmission(coordinator, saved.admissionId);
    expect(detail).toMatchObject({
      id: saved.admissionId,
      childId: saved.childId,
      childName: "TEST Applicant",
      dob: "2016-04-12",
      stage: "applicant",
      statusKey: "invited",
      isTerminal: false,
      sourceKey: "word_of_mouth",
      sourceLabel: "Word of mouth",
      assignedToId: coordinator.id,
      interviewOn: "2026-01-10",
      enquiryOn: "2026-01-05",
    });

    expect(detail?.guardians).toHaveLength(1);
    expect(detail?.guardians[0]).toMatchObject({
      name: "TEST Guardian",
      phone: "9000000000",
      relationLabel: "Mother",
    });

    // The enquiry's own first-stage event is the oldest one.
    expect(detail?.events.map((event) => event.kind)).toEqual([
      "status_change",
      "interview",
      "status_change",
    ]);
    expect(detail?.events[0]).toMatchObject({
      kind: "status_change",
      occurredOn: "2026-02-01",
      statusLabel: "Invited",
      authorName: coordinator.name,
    });
    expect(detail?.events[1]).toMatchObject({
      kind: "interview",
      occurredOn: "2026-01-10",
      note: "TEST interview note",
    });
  });

  it("flags a terminal stage", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });
    await changeStatus(coordinator, {
      admissionId: saved.admissionId,
      statusKey: "not_eligible",
      occurredOn: "2026-02-01",
    });

    const detail = await getAdmission(coordinator, saved.admissionId);
    expect(detail).toMatchObject({ statusKey: "not_eligible", isTerminal: true });
  });

  it("returns null for an unknown or anonymised admission", async () => {
    const coordinator = await makeUser("coordinator");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await expect(
      getAdmission(coordinator, "00000000-0000-4000-8000-000000000000"),
    ).resolves.toBeNull();

    await getDb().update(child).set({ anonymisedAt: new Date() }).where(eq(child.id, saved.childId));
    await expect(getAdmission(coordinator, saved.admissionId)).resolves.toBeNull();
  });

  it("refuses a role without admission.read", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const saved = await createEnquiry(coordinator, { fullName: "TEST Applicant" });

    await expect(getAdmission(teacher, saved.admissionId)).rejects.toThrow("admission.read");
  });
});
