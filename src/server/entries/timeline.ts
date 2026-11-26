import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { vChildTimeline } from "@/server/db/schema/views";

import { listEntriesByIds, type EntryListItem } from "../entries/queries";

/** 50 at a time (M2-03); the "show earlier" button asks for the next slice. */
export const TIMELINE_PAGE_SIZE = 50;

export type TimelineEvent =
  | { kind: "entry"; at: Date; entry: EntryListItem }
  | { kind: "enrolment"; at: Date; id: string; title: string };

export type TimelinePage = {
  events: TimelineEvent[];
  hasMore: boolean;
};

/**
 * A child's Journey tab (M2-03), newest first, from `v_child_timeline`.
 *
 * The view carries every source; the visibility filter lives here, so a
 * teacher's timeline never contains a restricted row (D13). Entries are
 * enriched in one follow-up query, so a page of 50 costs two queries.
 */
export async function listChildTimeline(
  user: SessionUser,
  childId: string,
  options: { before?: Date; categoryKey?: string; limit?: number } = {},
): Promise<TimelinePage> {
  assertCan(user, "child.read");
  const limit = Math.min(options.limit ?? TIMELINE_PAGE_SIZE, TIMELINE_PAGE_SIZE);

  const conditions = [eq(vChildTimeline.childId, childId)];
  if (!can(user, "restricted.read")) {
    conditions.push(eq(vChildTimeline.visibility, "staff"));
  }
  if (options.before) conditions.push(lt(vChildTimeline.at, options.before));

  if (options.categoryKey) {
    // A category filter means entries of that category; system rows stay out.
    conditions.push(eq(vChildTimeline.kind, "entry"));
    conditions.push(eq(vChildTimeline.categoryKey, options.categoryKey));
  }

  const rows = await getDb()
    .select()
    .from(vChildTimeline)
    .where(and(...conditions))
    .orderBy(desc(vChildTimeline.at), desc(vChildTimeline.refId))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const entryIds = page.filter((row) => row.refTable === "entry").map((row) => row.refId);
  const entries = await listEntriesByIds(user, entryIds);
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

  const events: TimelineEvent[] = [];
  for (const row of page) {
    if (row.refTable === "entry") {
      const entry = entriesById.get(row.refId);
      // A row deleted between the two queries simply drops out of the page.
      if (entry) events.push({ kind: "entry", at: row.at, entry });
    } else {
      events.push({ kind: "enrolment", at: row.at, id: row.refId, title: row.title });
    }
  }

  return { events, hasMore };
}
