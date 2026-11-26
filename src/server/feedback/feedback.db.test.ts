import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, feedback } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { saveFeedback, triageFeedback } from "./mutations";
import { getFeedbackAudioUrl, listFeedback } from "./queries";

const storage = vi.hoisted(() => ({ removeObject: vi.fn(async () => undefined) }));

vi.mock("@/server/storage", () => ({
  STORAGE_BUCKETS: { childFiles: "child-files", feedbackAudio: "feedback-audio" },
  createUploadUrl: vi.fn(),
  removeObject: storage.removeObject,
}));

beforeEach(resetDatabase);

let userCount = 0;

async function makeUser(role: SessionUser["role"]): Promise<SessionUser> {
  userCount += 1;
  const email = `${role}-${userCount}@example.com`;
  const [row] = await getDb()
    .insert(appUser)
    .values({ email, name: `TEST ${role} ${userCount}`, role })
    .returning({ id: appUser.id });
  if (!row) throw new Error("insert failed");
  return { id: row.id, name: `TEST ${role} ${userCount}`, email, role };
}

async function makeFeedback(authorId: string): Promise<string> {
  const id = randomUUID();
  await getDb()
    .insert(feedback)
    .values({
      id,
      authorId,
      audioPath: `feedback/${id}.webm`,
      durationS: 12,
      pageContext: JSON.stringify({ route: "/children/abc" }),
    });
  return id;
}

describe("saveFeedback", () => {
  it("stores the author, duration and page context with a new status", async () => {
    const teacher = await makeUser("teacher");
    const id = randomUUID();

    await saveFeedback(teacher, {
      id,
      durationS: 42,
      route: `/children/${randomUUID()}`,
      childId: undefined,
    });

    const [row] = await getDb().select().from(feedback).where(eq(feedback.id, id));
    expect(row).toMatchObject({
      authorId: teacher.id,
      durationS: 42,
      audioPath: `feedback/${id}.webm`,
      status: "new",
    });
    expect(JSON.parse(row?.pageContext ?? "")).toMatchObject({
      route: expect.stringMatching(/^\/children\//),
    });
  });

  it("keeps the audio when a retry hits the unique violation", async () => {
    const teacher = await makeUser("teacher");
    const id = randomUUID();
    const input = { id, durationS: 12, route: "/observe" };
    await saveFeedback(teacher, input);
    storage.removeObject.mockClear();

    await expect(saveFeedback(teacher, input)).rejects.toMatchObject({ code: "CONFLICT" });

    expect(storage.removeObject).not.toHaveBeenCalled();
    const rows = await getDb().select().from(feedback).where(eq(feedback.id, id));
    expect(rows).toHaveLength(1);
  });
});

describe("listFeedback", () => {
  it("returns only the teacher's own notes", async () => {
    const teacher = await makeUser("teacher");
    const other = await makeUser("coordinator");
    await makeFeedback(teacher.id);
    await makeFeedback(other.id);

    const result = await listFeedback(teacher);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.authorId).toBe(teacher.id);
  });

  it("returns every note to an admin", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher");
    await makeFeedback(teacher.id);
    await makeFeedback(admin.id);

    const result = await listFeedback(admin);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.authorName !== null)).toBe(true);
  });
});

describe("getFeedbackAudioUrl", () => {
  it("refuses another person's recording for a non-admin", async () => {
    const teacher = await makeUser("teacher");
    const other = await makeUser("coordinator");
    const id = await makeFeedback(other.id);

    await expect(getFeedbackAudioUrl(teacher, id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("triageFeedback", () => {
  it("lets an admin set the status and the triage note", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher");
    const id = await makeFeedback(teacher.id);

    await triageFeedback(admin, { id, status: "done", triageNote: "Fixed in class." });

    const [row] = await getDb().select().from(feedback).where(eq(feedback.id, id));
    expect(row).toMatchObject({ status: "done", triageNote: "Fixed in class." });
  });

  it("refuses triage from a teacher", async () => {
    const teacher = await makeUser("teacher");
    const id = await makeFeedback(teacher.id);

    await expect(
      triageFeedback(teacher, { id, status: "triaged", triageNote: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
