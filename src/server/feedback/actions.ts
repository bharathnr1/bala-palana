"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/server/auth/action";
import { action } from "@/server/auth/action";

import { beginFeedbackUpload, saveFeedback, saveFeedbackSchema } from "./mutations";

const emptyInput = z.object({});

const begin = action(emptyInput, async (_input, user) => beginFeedbackUpload(user));

const save = action(saveFeedbackSchema, async (input, user) => {
  const result = await saveFeedback(user, input);
  revalidatePath("/feedback");
  return result;
});

export async function beginFeedbackAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; uploadUrl: string }>> {
  return begin(formData);
}

export async function saveFeedbackAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return save(formData);
}
