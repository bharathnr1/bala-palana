import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate, type Tx } from "@/server/db/mutate";
import { child, entry, entryTag, lookup } from "@/server/db/schema";

import { categoryFlags, parseEntryDetails } from "./categories";

/** Authors may soft-delete their own entry for 24 hours (03 § Rules beyond the matrix). */
export const SELF_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** A form sends a `childIds` field once, comma-separated ("select a whole team"). */
const idList = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.uuid()).min(1).max(60));

const keyList = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().trim().min(1).max(60)).max(20).optional());

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());
const requiredNote = z.string().trim().min(1).max(2000);
const optionalDate = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, strings.children.errors.date)
    .optional(),
);

/** Accepts an ISO instant or a plain date ("today", 00:00 Asia/Kolkata). */
const optionalInstant = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date().optional());

/** The form sends details as JSON; a direct caller may pass an object. */
const detailsField = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.trim() === "") return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return Number.NaN;
  }
}, z.unknown());

export const createEntrySchema = z.object({
  childIds: idList,
  categoryKey: z.string().trim().min(1).max(60),
  note: optionalText,
  occurredAt: optionalInstant,
  subjectKey: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
  tagKeys: keyList,
  followUpOn: optionalDate,
  details: detailsField.optional(),
  parentId: z.preprocess(blankToUndefined, z.uuid().optional()),
});

export const updateEntrySchema = z.object({
  id: z.uuid(),
  note: optionalText,
  tagKeys: keyList,
  followUpOn: optionalDate,
  details: detailsField.optional(),
});

export const deleteEntrySchema = z.object({ id: z.uuid() });

/** Close and reopen share one input (M2-01). */
export const setEntryStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["open", "closed"]),
});

export const addFollowUpSchema = z.object({
  parentId: z.uuid(),
  note: requiredNote,
  followUpOn: optionalDate,
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type SetEntryStatusInput = z.infer<typeof setEntryStatusSchema>;
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;

type CategoryRow = {
  id: string;
  key: string;
  meta: Record<string, unknown>;
};

async function categoryByKey(tx: Tx, key: string): Promise<CategoryRow> {
  const [row] = await tx
    .select({ id: lookup.id, key: lookup.key, meta: lookup.meta })
    .from(lookup)
    .where(and(eq(lookup.kind, "entry_category"), eq(lookup.key, key), eq(lookup.active, true)))
    .limit(1);
  if (!row) throw new AppError("INVALID", strings.entries.errors.categoryUnknown);
  return row;
}

async function lookupIds(tx: Tx, kind: string, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const rows = await tx
    .select({ id: lookup.id, key: lookup.key })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), inArray(lookup.key, keys), eq(lookup.active, true)));
  const byKey = new Map(rows.map((row) => [row.key, row.id]));
  return keys.map((key) => {
    const id = byKey.get(key);
    if (!id) throw new AppError("INVALID", strings.entries.errors.unknownLookup(kind, key));
    return id;
  });
}

async function lookupId(tx: Tx, kind: string, key: string | undefined): Promise<string | null> {
  if (!key) return null;
  const [row] = await tx
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key), eq(lookup.active, true)))
    .limit(1);
  if (!row) throw new AppError("INVALID", strings.entries.errors.unknownLookup(kind, key));
  return row.id;
}

async function assertChildrenExist(tx: Tx, ids: string[]): Promise<void> {
  const rows = await tx
    .select({ id: child.id })
    .from(child)
    .where(inArray(child.id, ids));
  if (rows.length !== ids.length) throw new AppError("NOT_FOUND", strings.entries.errors.childMissing);
}

/** A corrective action must hang off a concern for the same child (02-schema § Examples). */
async function concernParentId(tx: Tx, parentId: string | undefined, childId: string): Promise<string> {
  if (!parentId) throw new AppError("INVALID", strings.entries.errors.followUpParent);
  const [parent] = await tx
    .select({ id: entry.id, childId: entry.childId, categoryKey: lookup.key })
    .from(entry)
    .innerJoin(lookup, eq(entry.categoryId, lookup.id))
    .where(and(eq(entry.id, parentId), isNull(entry.deletedAt)))
    .limit(1);
  if (!parent || parent.childId !== childId || parent.categoryKey !== "concern") {
    throw new AppError("INVALID", strings.entries.errors.followUpParent);
  }
  return parent.id;
}

/**
 * Creates one row per child with a shared `group_key` (D23). A concern opens a
 * follow-up (`status = 'open'`), and so does any entry given a `follow_up_on`.
 */
export async function createEntries(
  user: SessionUser,
  input: CreateEntryInput,
): Promise<{ ids: string[]; groupKey: string | null }> {
  assertCan(user, "entry.create");
  const childIds = [...new Set(input.childIds)];
  if (input.categoryKey === "corrective_action" && childIds.length !== 1) {
    throw new AppError("INVALID", strings.entries.errors.singleChild);
  }
  if (input.parentId && input.categoryKey !== "corrective_action") {
    throw new AppError("INVALID", strings.entries.errors.followUpParent);
  }

  return mutate(user, async (tx) => {
    const category = await categoryByKey(tx, input.categoryKey);
    const flags = categoryFlags(category.meta);
    if (flags.restricted) assertCan(user, "restricted.read");

    const parsed = parseEntryDetails(input.categoryKey, input.details);
    if (!parsed.ok) throw new AppError("INVALID", strings.entries.errors.details);

    await assertChildrenExist(tx, childIds);
    const subjectId = await lookupId(tx, "subject", input.subjectKey);
    const tagIds = await lookupIds(tx, "tag", input.tagKeys ?? []);
    const parentId =
      input.categoryKey === "corrective_action"
        ? await concernParentId(tx, input.parentId, childIds[0]!)
        : null;

    const groupKey = childIds.length > 1 ? crypto.randomUUID() : null;
    const isOpen = flags.opensFollowUp || Boolean(input.followUpOn);
    const occurredAt = input.occurredAt ?? new Date();

    const inserted = await tx
      .insert(entry)
      .values(
        childIds.map((childId) => ({
          childId,
          categoryId: category.id,
          note: input.note ?? null,
          details: parsed.details,
          subjectId,
          occurredAt,
          authorId: user.id,
          visibility: flags.restricted ? ("restricted" as const) : ("staff" as const),
          followUpOn: input.followUpOn ?? null,
          status: isOpen ? ("open" as const) : null,
          parentId,
          groupKey,
        })),
      )
      .returning({ id: entry.id });

    if (tagIds.length > 0) {
      await tx
        .insert(entryTag)
        .values(inserted.flatMap((row) => tagIds.map((tagId) => ({ entryId: row.id, tagId }))))
        .onConflictDoNothing();
    }

    return { ids: inserted.map((row) => row.id), groupKey };
  });
}

/** Edits note, tags, details and `follow_up_on` only (03 § Own entries). */
export async function updateEntry(
  user: SessionUser,
  input: UpdateEntryInput,
): Promise<{ id: string; childId: string }> {
  return mutate(user, async (tx) => {
    const row = await editableEntry(tx, input.id, user);
    const allowed =
      can(user, "entry.edit_any") || (can(user, "entry.edit_own") && row.authorId === user.id);
    if (!allowed) throw new AppError("FORBIDDEN", strings.entries.errors.forbidden);

    const patch: Partial<typeof entry.$inferInsert> = { updatedAt: new Date() };
    if (input.note !== undefined) patch.note = input.note;
    if (input.followUpOn !== undefined) patch.followUpOn = input.followUpOn;

    if (input.details !== undefined) {
      const parsed = parseEntryDetails(row.categoryKey, input.details);
      if (!parsed.ok) throw new AppError("INVALID", strings.entries.errors.details);
      patch.details = parsed.details;
    }

    await tx.update(entry).set(patch).where(eq(entry.id, input.id));

    if (input.tagKeys !== undefined) {
      const tagIds = await lookupIds(tx, "tag", input.tagKeys);
      await tx.delete(entryTag).where(eq(entryTag.entryId, input.id));
      if (tagIds.length > 0) {
        await tx
          .insert(entryTag)
          .values(tagIds.map((tagId) => ({ entryId: input.id, tagId })))
          .onConflictDoNothing();
      }
    }

    return { id: input.id, childId: row.childId };
  });
}

type EditableEntry = {
  id: string;
  childId: string;
  authorId: string;
  createdAt: Date;
  categoryKey: string;
  restricted: boolean;
};

async function editableEntry(tx: Tx, id: string, user: SessionUser): Promise<EditableEntry> {
  const [row] = await tx
    .select({
      id: entry.id,
      childId: entry.childId,
      authorId: entry.authorId,
      createdAt: entry.createdAt,
      categoryKey: lookup.key,
      meta: lookup.meta,
    })
    .from(entry)
    .innerJoin(lookup, eq(entry.categoryId, lookup.id))
    .where(and(eq(entry.id, id), isNull(entry.deletedAt)))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", strings.entries.errors.notFound);
  const restricted = categoryFlags(row.meta).restricted;
  // A row the reader may not see does not exist for them (D13).
  if (restricted && !can(user, "restricted.read")) {
    throw new AppError("NOT_FOUND", strings.entries.errors.notFound);
  }
  return { ...row, restricted };
}

/** Soft-deletes: `delete_any`, or the author's own entry within 24 hours. */
export async function deleteEntry(
  user: SessionUser,
  input: z.infer<typeof deleteEntrySchema>,
): Promise<{ id: string; childId: string }> {
  return mutate(user, async (tx) => {
    const row = await editableEntry(tx, input.id, user);

    if (!can(user, "entry.delete_any")) {
      const isOwn = row.authorId === user.id && can(user, "entry.edit_own");
      const isRecent = Date.now() - row.createdAt.getTime() <= SELF_DELETE_WINDOW_MS;
      if (!isOwn) throw new AppError("FORBIDDEN", strings.entries.errors.forbidden);
      if (!isRecent) throw new AppError("FORBIDDEN", strings.entries.errors.deleteTooLate);
    }

    await tx.update(entry).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(entry.id, input.id));
    return { id: input.id, childId: row.childId };
  });
}

/** Closes or reopens a follow-up; `closed_by` records who (03 § Rules beyond the matrix). */
export async function setEntryStatus(
  user: SessionUser,
  input: SetEntryStatusInput,
): Promise<{ id: string; status: "open" | "closed"; childId: string }> {
  assertCan(user, "entry.close_follow_up");

  return mutate(user, async (tx) => {
    const [row] = await tx
      .select({
        id: entry.id,
        childId: entry.childId,
        status: entry.status,
        categoryKey: lookup.key,
        meta: lookup.meta,
      })
      .from(entry)
      .innerJoin(lookup, eq(entry.categoryId, lookup.id))
      .where(and(eq(entry.id, input.id), isNull(entry.deletedAt)))
      .limit(1);

    if (!row) throw new AppError("NOT_FOUND", strings.entries.errors.notFound);
    if (categoryFlags(row.meta).restricted && !can(user, "restricted.read")) {
      throw new AppError("NOT_FOUND", strings.entries.errors.notFound);
    }
    if (row.status === input.status) {
      throw new AppError(
        "CONFLICT",
        input.status === "closed" ? strings.entries.errors.alreadyClosed : strings.entries.errors.alreadyOpen,
      );
    }

    const closing = input.status === "closed";
    await tx
      .update(entry)
      .set({
        status: input.status,
        closedAt: closing ? new Date() : null,
        closedBy: closing ? user.id : null,
        updatedAt: new Date(),
      })
      .where(eq(entry.id, input.id));

    return { id: input.id, childId: row.childId, status: input.status };
  });
}

/** Adds a note to a thread: a child row pointing at its parent (`parent_id`). */
export async function addFollowUp(
  user: SessionUser,
  input: AddFollowUpInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "entry.create");

  return mutate(user, async (tx) => {
    const [parent] = await tx
      .select({
        id: entry.id,
        childId: entry.childId,
        categoryId: entry.categoryId,
        visibility: entry.visibility,
        meta: lookup.meta,
      })
      .from(entry)
      .innerJoin(lookup, eq(entry.categoryId, lookup.id))
      .where(and(eq(entry.id, input.parentId), isNull(entry.deletedAt)))
      .limit(1);

    if (!parent) throw new AppError("NOT_FOUND", strings.entries.errors.notFound);
    if (categoryFlags(parent.meta).restricted) assertCan(user, "restricted.read");

    const [row] = await tx
      .insert(entry)
      .values({
        childId: parent.childId,
        categoryId: parent.categoryId,
        parentId: parent.id,
        note: input.note,
        details: {},
        authorId: user.id,
        visibility: parent.visibility,
        followUpOn: input.followUpOn ?? null,
        status: input.followUpOn ? "open" : null,
      })
      .returning({ id: entry.id });

    if (!row) throw new AppError("INVALID", strings.errors.unexpected);
    return { id: row.id, childId: parent.childId };
  });
}
