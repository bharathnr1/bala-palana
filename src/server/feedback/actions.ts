"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/server/auth/action";
import { action } from "@/server/auth/action";

import {
  beginFeedbackUpload,
  saveFeedback,
  saveFeedbackSchema,
  triageFeedback,
  triageFeedbackSchema,
} from "./mutations";
import { getFeedbackAudioUrl } from "./queries";

const emptyInput = z.object({});
const audioInput = z.object({ id: z.uuid() });

const begin = action(emptyInput, async (_input, user) => beginFeedbackUpload(user));

const save = action(saveFeedbackSchema, async (input, user) => {
  const result = await saveFeedback(user, input);
  revalidatePath("/feedback");
  return result;
});

const triage = action(triageFeedbackSchema, async (input, user) => {
  const result = await triageFeedback(user, input);
  revalidatePath("/feedback");
  return result;
});

const audio = action(audioInput, async (input, user) => getFeedbackAudioUrl(user, input.id));

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

export async function triageFeedbackAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return triage(formData);
}

export async function feedbackAudioAction(formData: FormData): Promise<ActionResult<string>> {
  return audio(formData);
}
