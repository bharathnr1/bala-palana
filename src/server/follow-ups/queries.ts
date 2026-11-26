import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { vOpenFollowUps } from "@/server/db/schema/views";

/** The list stays bounded (AGENTS.md § Coding rules); the soonest 100 show. */
export const FOLLOW_UPS_LIMIT = 100;

export type FollowUpRow = {
  entryId: string;
  childId: string;
  childName: string;
  categoryKey: string;
  categoryLabel: string;
  note: string | null;
  followUpOn: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
};

export type FollowUpList = {
  rows: FollowUpRow[];
  hasMore: boolean;
};

/**
 * Open follow-ups from `v_open_follow_ups` (M2-05), soonest first. Mine is the
 * owner's own; everything else is the coordinator's view. A teacher never
 * receives a restricted row, because the filter is in the query (D13).
 */
export async function listOpenFollowUps(
  user: SessionUser,
  options: { mine?: boolean } = {},
): Promise<FollowUpList> {
  assertCan(user, "entry.create");

  const conditions = [];
  if (!can(user, "restricted.read")) conditions.push(eq(vOpenFollowUps.visibility, "staff"));
  if (options.mine) conditions.push(eq(vOpenFollowUps.authorId, user.id));

  const rows = await getDb()
    .select({
      entryId: vOpenFollowUps.entryId,
      childId: vOpenFollowUps.childId,
      childName: vOpenFollowUps.childName,
      categoryKey: vOpenFollowUps.categoryKey,
      categoryLabel: vOpenFollowUps.categoryLabel,
      note: vOpenFollowUps.note,
      followUpOn: vOpenFollowUps.followUpOn,
      authorId: vOpenFollowUps.authorId,
      authorName: vOpenFollowUps.authorName,
      parentId: vOpenFollowUps.parentId,
    })
    .from(vOpenFollowUps)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(vOpenFollowUps.followUpOn), asc(vOpenFollowUps.childName))
    .limit(FOLLOW_UPS_LIMIT + 1);

  return { rows: rows.slice(0, FOLLOW_UPS_LIMIT), hasMore: rows.length > FOLLOW_UPS_LIMIT };
}
