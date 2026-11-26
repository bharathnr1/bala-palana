import "server-only";

import { desc, eq } from "drizzle-orm";

import type { FeedbackStatus } from "@/lib/feedback";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, feedback } from "@/server/db/schema";
import { createDownloadUrl, STORAGE_BUCKETS } from "@/server/storage";

/** Lists past 50 rows are paginated (AGENTS.md § Coding rules). */
export const FEEDBACK_PAGE_SIZE = 50;

export type FeedbackListItem = {
  id: string;
  authorId: string | null;
  authorName: string | null;
  audioPath: string | null;
  durationS: number | null;
  pageContext: string | null;
  transcript: string | null;
  status: FeedbackStatus;
  triageNote: string | null;
  createdAt: Date;
  audioDeletedAt: Date | null;
};

export type FeedbackList = {
  rows: FeedbackListItem[];
  page: number;
  hasMore: boolean;
};

/**
 * The feedback list (M1-03). An admin sees every note; everyone else sees
 * only her own, and the filter is part of the query (D13, D25).
 */
export async function listFeedback(user: SessionUser, page: number = 1): Promise<FeedbackList> {
  assertCan(user, "feedback.create");

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const canTriage = can(user, "feedback.triage");

  const rows = await getDb()
    .select({
      id: feedback.id,
      authorId: feedback.authorId,
      authorName: appUser.name,
      audioPath: feedback.audioPath,
      durationS: feedback.durationS,
      pageContext: feedback.pageContext,
      transcript: feedback.transcript,
      status: feedback.status,
      triageNote: feedback.triageNote,
      createdAt: feedback.createdAt,
      audioDeletedAt: feedback.audioDeletedAt,
    })
    .from(feedback)
    .leftJoin(appUser, eq(feedback.authorId, appUser.id))
    .where(canTriage ? undefined : eq(feedback.authorId, user.id))
    .orderBy(desc(feedback.createdAt))
    .limit(FEEDBACK_PAGE_SIZE + 1)
    .offset((safePage - 1) * FEEDBACK_PAGE_SIZE);

  return {
    rows: rows.slice(0, FEEDBACK_PAGE_SIZE),
    page: safePage,
    hasMore: rows.length > FEEDBACK_PAGE_SIZE,
  };
}

/**
 * A fresh five-minute signed URL for one recording (D16). Only the author or
 * an admin may listen; the check happens before Storage is touched.
 */
export async function getFeedbackAudioUrl(user: SessionUser, id: string): Promise<string> {
  assertCan(user, "feedback.create");

  const [row] = await getDb()
    .select({
      authorId: feedback.authorId,
      audioPath: feedback.audioPath,
      audioDeletedAt: feedback.audioDeletedAt,
    })
    .from(feedback)
    .where(eq(feedback.id, id))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", strings.feedback.errors.notFound);
  if (!can(user, "feedback.triage") && row.authorId !== user.id) {
    throw new AppError("FORBIDDEN", strings.feedback.errors.forbidden);
  }
  if (!row.audioPath || row.audioDeletedAt) {
    throw new AppError("NOT_FOUND", strings.feedback.errors.audioMissing);
  }

  return createDownloadUrl(STORAGE_BUCKETS.feedbackAudio, row.audioPath);
}
