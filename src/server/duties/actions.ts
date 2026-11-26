"use server";

/**
 * The Server Actions for duty cycles (M3-01). The logic lives in `mutations.ts`
 * so the DB tests can call it without a form; this file wires the shapes and
 * the cache invalidation that only works inside a request.
 */
import { revalidatePath } from "next/cache";

import { action } from "@/server/auth/action";

import {
  changeCycleStatus,
  changeCycleStatusSchema,
  mergeCyclePair,
  mergeCyclesSchema,
  saveCycleDates,
  saveCycleDatesSchema,
  splitCycleAt,
  splitCycleSchema,
} from "./mutations";

export const updateCycleDates = action(saveCycleDatesSchema, async (input, user) => {
  await saveCycleDates(user, input);
  revalidatePath("/duties");
});

export const splitCycle = action(splitCycleSchema, async (input, user) => {
  await splitCycleAt(user, input);
  revalidatePath("/duties");
});

export const mergeCycles = action(mergeCyclesSchema, async (input, user) => {
  await mergeCyclePair(user, input);
  revalidatePath("/duties");
});

export const setCycleStatus = action(changeCycleStatusSchema, async (input, user) => {
  await changeCycleStatus(user, input);
  revalidatePath("/duties");
});
