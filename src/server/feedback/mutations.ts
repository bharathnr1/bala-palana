import "server-only";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { MAX_FEEDBACK_SECONDS } from "@/lib/feedback";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate } from "@/server/db/mutate";
import { feedback } from "@/server/db/schema";
import { createUploadUrl, removeObject, STORAGE_BUCKETS } from "@/server/storage";

/** Where a voice note lives in the private bucket (02-schema § Files). */
export function feedbackAudioPath(id: string): string {
  return `feedback/${id}.webm`;
}

export const saveFeedbackSchema = z.object({
  id: z.uuid(),
  durationS: z.coerce.number().int().min(1).max(MAX_FEEDBACK_SECONDS),
  route: z.string().trim().min(1).max(300).regex(/^\//, "A route starts with /"),
  childId: z.uuid().optional(),
});
export type SaveFeedbackInput = z.infer<typeof saveFeedbackSchema>;

/**
 * Two-phase upload (M1-02): the server mints the row's id and a signed upload
 * URL, the phone PUTs the audio, then `saveFeedback` writes the row. An
 * abandoned recording therefore leaves no database row behind.
 */
export async function beginFeedbackUpload(
  user: SessionUser,
): Promise<{ id: string; uploadUrl: string }> {
  assertCan(user, "feedback.create");

  const id = randomUUID();
  const uploadUrl = await createUploadUrl(STORAGE_BUCKETS.feedbackAudio, feedbackAudioPath(id));
  return { id, uploadUrl };
}

/** Stores author, duration and page context once the audio is in the bucket. */
export async function saveFeedback(
  user: SessionUser,
  input: SaveFeedbackInput,
): Promise<{ id: string }> {
  assertCan(user, "feedback.create");

  const path = feedbackAudioPath(input.id);
  const pageContext = JSON.stringify({ route: input.route, childId: input.childId });

  try {
    await mutate(user, async (tx) => {
      await tx.insert(feedback).values({
        id: input.id,
        authorId: user.id,
        audioPath: path,
        durationS: input.durationS,
        pageContext,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // The first attempt already saved the row (and its audio); a retry must
      // never delete the object that row points at.
      throw new AppError("CONFLICT", strings.feedback.errors.alreadySaved);
    }
    // The object is useless without its row, so clean it up rather than orphan it.
    await removeObject(STORAGE_BUCKETS.feedbackAudio, path).catch(() => undefined);
    throw error;
  }

  return { id: input.id };
}

function isUniqueViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23505";
}

/** Drizzle wraps driver errors, so the Postgres code can sit on `cause`. */
function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") return code;

  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") return causeCode;
  }
  return undefined;
}
