import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { vOpenFollowUps } from "@/server/db/schema/views";

/** The list stays bounded (AGENTS.md § Coding rules); the soonest 100 show. */
export const FOLLOW_UPS_LIMIT = 100;

type FollowUpBase = {
  childId: string;
  childName: string;
  categoryKey: string;
  categoryLabel: string;
  note: string | null;
  followUpOn: string;
  authorId: string | null;
  authorName: string | null;
};

/** An entry keeps its thread; an admission follow-up opens the admission. */
export type FollowUpRow = FollowUpBase &
  (
    | { kind: "entry"; entryId: string; parentId: string | null }
    | { kind: "admission"; admissionId: string }
  );

export type FollowUpList = {
  rows: FollowUpRow[];
  hasMore: boolean;
};

/**
 * Open follow-ups from `v_open_follow_ups` (M2-05): entries waiting on someone
 * and admissions with a follow-up date (M5-01), soonest first. Mine is the
 * owner's own; everything else is the coordinator's view. A teacher never
 * receives a restricted entry or an admission, because the filter is in the
 * query (D13).
 */
export async function listOpenFollowUps(
  user: SessionUser,
  options: { mine?: boolean } = {},
): Promise<FollowUpList> {
  assertCan(user, "entry.create");

  const conditions = [];
  if (!can(user, "restricted.read")) conditions.push(eq(vOpenFollowUps.visibility, "staff"));
  if (!can(user, "admission.read")) conditions.push(isNull(vOpenFollowUps.admissionId));
  if (options.mine) conditions.push(eq(vOpenFollowUps.authorId, user.id));

  const rows = await getDb()
    .select({
      entryId: vOpenFollowUps.entryId,
      admissionId: vOpenFollowUps.admissionId,
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

  const page = rows.slice(0, FOLLOW_UPS_LIMIT);
  return { rows: page.map(toRow), hasMore: rows.length > FOLLOW_UPS_LIMIT };
}

function toRow(row: {
  entryId: string | null;
  admissionId: string | null;
  childId: string;
  childName: string;
  categoryKey: string;
  categoryLabel: string;
  note: string | null;
  followUpOn: string;
  authorId: string | null;
  authorName: string | null;
  parentId: string | null;
}): FollowUpRow {
  const base = {
    childId: row.childId,
    childName: row.childName,
    categoryKey: row.categoryKey,
    categoryLabel: row.categoryLabel,
    note: row.note,
    followUpOn: row.followUpOn,
    authorId: row.authorId,
    authorName: row.authorName,
  };

  // The view guarantees exactly one of the two ids (M5-01 migration).
  if (row.entryId) return { ...base, kind: "entry", entryId: row.entryId, parentId: row.parentId };
  if (row.admissionId) return { ...base, kind: "admission", admissionId: row.admissionId };
  throw new Error("v_open_follow_ups row without an entry or admission id");
}
