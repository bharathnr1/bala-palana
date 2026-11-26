"use server";

/**
 * The Server Actions for entries (M2-01). The logic lives in `mutations.ts` so
 * the DB tests can call it without a form; this file wires the shapes and the
 * cache invalidation that only works inside a request.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { action } from "@/server/auth/action";
import { requireUser } from "@/server/auth/session";

import {
  addFollowUp,
  addFollowUpSchema,
  createEntries,
  createEntrySchema,
  deleteEntry,
  deleteEntrySchema,
  setEntryStatus,
  setEntryStatusSchema,
  updateEntry,
  updateEntrySchema,
} from "./mutations";
import { listChildTimeline, type TimelinePage } from "./timeline";

export type TimelinePageResult =
  | { ok: true; page: TimelinePage }
  | { ok: false; message: string };

const timelinePageSchema = z.object({
  childId: z.uuid(),
  before: z.iso.datetime().optional(),
  categoryKey: z.string().trim().max(60).optional(),
});

/**
 * The Journey tab's "show earlier" (M2-03). A read, so it is not a `mutate()`;
 * the query keeps the visibility filter and the page size.
 */
export async function loadTimelinePage(input: unknown): Promise<TimelinePageResult> {
  const user = await requireUser();
  const parsed = timelinePageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: strings.errors.invalidForm };

  try {
    const page = await listChildTimeline(user, parsed.data.childId, {
      before: parsed.data.before ? new Date(parsed.data.before) : undefined,
      categoryKey: parsed.data.categoryKey,
    });
    return { ok: true, page };
  } catch (error) {
    console.error("timeline page failed:", error instanceof Error ? error.message : error);
    return { ok: false, message: strings.entries.timeline.loadError };
  }
}

function revalidateEntryViews(childIds: string[]): void {
  for (const childId of childIds) revalidatePath(`/children/${childId}`);
  revalidatePath("/");
  revalidatePath("/follow-ups");
  revalidatePath("/attention");
}

const create = action(createEntrySchema, async (input, user) => {
  const result = await createEntries(user, input);
  revalidateEntryViews([...new Set(input.childIds)]);
  return result;
});

const edit = action(updateEntrySchema, async (input, user) => {
  const result = await updateEntry(user, input);
  revalidateEntryViews([result.childId]);
  return result;
});

const remove = action(deleteEntrySchema, async (input, user) => {
  const result = await deleteEntry(user, input);
  revalidateEntryViews([result.childId]);
  return result;
});

const changeStatus = action(setEntryStatusSchema, async (input, user) => {
  const result = await setEntryStatus(user, input);
  revalidateEntryViews([result.childId]);
  return result;
});

const followUp = action(addFollowUpSchema, async (input, user) => {
  const result = await addFollowUp(user, input);
  revalidateEntryViews([result.childId]);
  return result;
});

/** Form entry points; the wrappers above own the validation and the guards. */
export async function createEntry(formData: FormData): Promise<ActionResult<unknown>> {
  return create(formData);
}

export async function editEntry(formData: FormData): Promise<ActionResult<unknown>> {
  return edit(formData);
}

export async function removeEntry(formData: FormData): Promise<ActionResult<unknown>> {
  return remove(formData);
}

export async function changeEntryStatus(formData: FormData): Promise<ActionResult<unknown>> {
  return changeStatus(formData);
}

export async function addEntryFollowUp(formData: FormData): Promise<ActionResult<unknown>> {
  return followUp(formData);
}
