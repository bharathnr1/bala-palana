"use server";

/**
 * The Server Actions for duty cycles (M3-01). The logic lives in `mutations.ts`
 * so the DB tests can call it without a form; this file wires the shapes and
 * the cache invalidation that only works inside a request.
 */
import { revalidatePath } from "next/cache";

import { action } from "@/server/auth/action";

import {
  addTeamMembers,
  addTeamMembersSchema,
  changeCycleStatus,
  changeCycleStatusSchema,
  copyCycleTeams,
  copyCycleTeamsSchema,
  createTeam,
  createTeamSchema,
  memberIdSchema,
  mergeCyclePair,
  mergeCyclesSchema,
  moveTeamMember,
  moveTeamMemberSchema,
  removeTeamMember,
  saveCycleDates,
  saveCycleDatesSchema,
  setMemberDates,
  setMemberDatesSchema,
  setMemberRole,
  setMemberRoleSchema,
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

// ------------------------------------------------------------- the board ----

export const addTeam = action(createTeamSchema, async (input, user) => {
  const row = await createTeam(user, input);
  revalidatePath("/duties");
  return row;
});

export const addTeamChildren = action(addTeamMembersSchema, async (input, user) => {
  const added = await addTeamMembers(user, input);
  revalidatePath("/duties");
  return { added };
});

export const removeMember = action(memberIdSchema, async (input, user) => {
  await removeTeamMember(user, input);
  revalidatePath("/duties");
});

export const setMemberRoleAction = action(setMemberRoleSchema, async (input, user) => {
  await setMemberRole(user, input);
  revalidatePath("/duties");
});

export const setMemberDatesAction = action(setMemberDatesSchema, async (input, user) => {
  await setMemberDates(user, input);
  revalidatePath("/duties");
});

export const moveMember = action(moveTeamMemberSchema, async (input, user) => {
  await moveTeamMember(user, input);
  revalidatePath("/duties");
});

export const copyLastCycle = action(copyCycleTeamsSchema, async (input, user) => {
  const counts = await copyCycleTeams(user, input);
  revalidatePath("/duties");
  return counts;
});
