"use server";

/**
 * The Server Actions for assessments (M4-01). The logic lives in `mutations.ts`
 * so the DB tests can call it without a form; this file wires the shapes and
 * the cache invalidation that only works inside a request.
 */
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/server/auth/action";
import { action } from "@/server/auth/action";

import {
  deleteAssessment,
  deleteAssessmentSchema,
  upsertAssessment,
  upsertAssessmentSchema,
} from "./mutations";

function revalidateAssessmentViews(childId: string): void {
  revalidatePath(`/children/${childId}`);
  revalidatePath("/academics");
  revalidatePath("/reports/grade-summary");
}

const save = action(upsertAssessmentSchema, async (input, user) => {
  const result = await upsertAssessment(user, input);
  revalidateAssessmentViews(result.childId);
  return result;
});

const remove = action(deleteAssessmentSchema, async (input, user) => {
  const result = await deleteAssessment(user, input);
  revalidateAssessmentViews(result.childId);
  return result;
});

export type SavedAssessment = { id: string; childId: string };

export async function saveAssessment(formData: FormData): Promise<ActionResult<SavedAssessment>> {
  return save(formData);
}

export async function removeAssessment(formData: FormData): Promise<ActionResult<SavedAssessment>> {
  return remove(formData);
}
