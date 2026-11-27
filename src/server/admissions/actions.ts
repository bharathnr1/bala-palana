"use server";

/**
 * The Server Actions for admissions (M5-01). The logic lives in `mutations.ts`
 * so the DB tests can call it without a form; this file wires the cache
 * invalidation that only works inside a request.
 */
import { revalidatePath } from "next/cache";

import { action } from "@/server/auth/action";

import {
  addEvent,
  addEventSchema,
  changeStatus,
  changeStatusSchema,
  createEnquiry,
  createEnquirySchema,
  setNextAction,
  setNextActionSchema,
} from "./mutations";

function revalidateAdmission(childId: string): void {
  revalidatePath("/admissions");
  revalidatePath("/follow-ups");
  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
}

export const createAdmissionEnquiry = action(createEnquirySchema, async (input, user) => {
  const saved = await createEnquiry(user, input);
  revalidatePath("/children");
  revalidateAdmission(saved.childId);
  return saved;
});

export const changeAdmissionStatus = action(changeStatusSchema, async (input, user) => {
  const saved = await changeStatus(user, input);
  revalidateAdmission(saved.childId);
  return saved;
});

export const addAdmissionEvent = action(addEventSchema, async (input, user) => {
  const saved = await addEvent(user, input);
  revalidateAdmission(saved.childId);
  return saved;
});

export const setAdmissionNextAction = action(setNextActionSchema, async (input, user) => {
  const saved = await setNextAction(user, input);
  revalidateAdmission(saved.childId);
  return saved;
});
