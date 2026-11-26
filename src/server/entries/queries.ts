import "server-only";

import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, entry, entryTag, lookup } from "@/server/db/schema";

/** Lists past 50 rows are paginated (AGENTS.md § Coding rules). */
export const ENTRIES_PAGE_SIZE = 50;

const category = alias(lookup, "category");
const subject = alias(lookup, "subject");
const author = alias(appUser, "author");

export type EntryTag = { key: string; label: string };

export type EntryListItem = {
  id: string;
  childId: string;
  categoryKey: string;
  categoryLabel: string;
  note: string | null;
  occurredAt: Date;
  authorId: string;
  authorName: string;
  subjectLabel: string | null;
  visibility: "staff" | "restricted";
  status: "open" | "closed" | null;
  followUpOn: string | null;
  parentId: string | null;
  tags: EntryTag[];
};

export type EntryThread = {
  entry: EntryListItem;
  parent: EntryListItem | null;
  replies: EntryListItem[];
};

export type ChildEntries = {
  rows: EntryListItem[];
  hasMore: boolean;
};

type EntryRow = Omit<EntryListItem, "tags">;

const entryColumns = {
  id: entry.id,
  childId: entry.childId,
  categoryKey: category.key,
  categoryLabel: category.label,
  note: entry.note,
  occurredAt: entry.occurredAt,
  authorId: entry.authorId,
  authorName: author.name,
  subjectLabel: subject.label,
  visibility: entry.visibility,
  status: entry.status,
  followUpOn: entry.followUpOn,
  parentId: entry.parentId,
};

/** The visibility filter D13 puts in every query, not in the UI. */
function visibleTo(user: SessionUser) {
  return can(user, "restricted.read") ? undefined : eq(entry.visibility, "staff");
}

async function tagsFor(ids: string[]): Promise<Map<string, EntryTag[]>> {
  const byEntry = new Map<string, EntryTag[]>();
  if (ids.length === 0) return byEntry;

  const rows = await getDb()
    .select({ entryId: entryTag.entryId, key: lookup.key, label: lookup.label })
    .from(entryTag)
    .innerJoin(lookup, eq(entryTag.tagId, lookup.id))
    .where(inArray(entryTag.entryId, ids));

  for (const row of rows) {
    const list = byEntry.get(row.entryId) ?? [];
    list.push({ key: row.key, label: row.label });
    byEntry.set(row.entryId, list);
  }
  return byEntry;
}

async function withTags(rows: EntryRow[]): Promise<EntryListItem[]> {
  const tags = await tagsFor(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, tags: tags.get(row.id) ?? [] }));
}

/**
 * Entries by id, used by the Journey timeline to enrich the view's rows in one
 * query rather than one per row. The visibility filter is applied again here,
 * so a hand-built id list cannot widen what a teacher reads.
 */
export async function listEntriesByIds(
  user: SessionUser,
  ids: readonly string[],
): Promise<EntryListItem[]> {
  assertCan(user, "child.read");
  if (ids.length === 0) return [];

  const conditions = [inArray(entry.id, [...ids]), isNull(entry.deletedAt)];
  const visibility = visibleTo(user);
  if (visibility) conditions.push(visibility);

  const rows = await getDb()
    .select(entryColumns)
    .from(entry)
    .innerJoin(category, eq(entry.categoryId, category.id))
    .innerJoin(author, eq(entry.authorId, author.id))
    .leftJoin(subject, eq(entry.subjectId, subject.id))
    .where(and(...conditions));

  return withTags(rows);
}

/**
 * One child's timeline, newest first. A teacher never receives a restricted
 * row because the filter is part of the query (D13).
 */
export async function listEntriesForChild(
  user: SessionUser,
  childId: string,
  options: { before?: Date; limit?: number } = {},
): Promise<ChildEntries> {
  assertCan(user, "child.read");
  const limit = Math.min(options.limit ?? ENTRIES_PAGE_SIZE, ENTRIES_PAGE_SIZE);

  const conditions = [eq(entry.childId, childId), isNull(entry.deletedAt)];
  const visibility = visibleTo(user);
  if (visibility) conditions.push(visibility);
  if (options.before) conditions.push(lt(entry.occurredAt, options.before));

  const rows = await getDb()
    .select(entryColumns)
    .from(entry)
    .innerJoin(category, eq(entry.categoryId, category.id))
    .innerJoin(author, eq(entry.authorId, author.id))
    .leftJoin(subject, eq(entry.subjectId, subject.id))
    .where(and(...conditions))
    .orderBy(desc(entry.occurredAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  return { rows: await withTags(rows.slice(0, limit)), hasMore };
}

function notFound(): AppError {
  return new AppError("NOT_FOUND", strings.entries.errors.notFound);
}

/** An entry, the entry it hangs off, and everything in its thread. */
export async function getEntryWithThread(user: SessionUser, id: string): Promise<EntryThread> {
  assertCan(user, "child.read");
  const visibility = visibleTo(user);

  const conditions = [eq(entry.id, id), isNull(entry.deletedAt)];
  if (visibility) conditions.push(visibility);

  const [row] = await getDb()
    .select(entryColumns)
    .from(entry)
    .innerJoin(category, eq(entry.categoryId, category.id))
    .innerJoin(author, eq(entry.authorId, author.id))
    .leftJoin(subject, eq(entry.subjectId, subject.id))
    .where(and(...conditions))
    .limit(1);

  if (!row) throw notFound();

  const parentRows = row.parentId
    ? await getDb()
        .select(entryColumns)
        .from(entry)
        .innerJoin(category, eq(entry.categoryId, category.id))
        .innerJoin(author, eq(entry.authorId, author.id))
        .leftJoin(subject, eq(entry.subjectId, subject.id))
        .where(
          and(
            eq(entry.id, row.parentId),
            isNull(entry.deletedAt),
            ...(visibility ? [visibility] : []),
          ),
        )
        .limit(1)
    : [];

  const replyConditions = [eq(entry.parentId, id), isNull(entry.deletedAt)];
  if (visibility) replyConditions.push(visibility);
  const replyRows = await getDb()
    .select(entryColumns)
    .from(entry)
    .innerJoin(category, eq(entry.categoryId, category.id))
    .innerJoin(author, eq(entry.authorId, author.id))
    .leftJoin(subject, eq(entry.subjectId, subject.id))
    .where(and(...replyConditions))
    .orderBy(asc(entry.occurredAt));

  const [withEntry] = await withTags([row]);
  const [parent] = await withTags(parentRows);
  const replies = await withTags(replyRows);
  if (!withEntry) throw notFound();

  return { entry: withEntry, parent: parent ?? null, replies };
}
