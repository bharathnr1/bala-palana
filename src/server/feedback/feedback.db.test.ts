import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, feedback } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { saveFeedback } from "./mutations";

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
});
