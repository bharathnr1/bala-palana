import "server-only";

import type { z } from "zod";

import { strings } from "@/lib/strings";

import { AppError, type AppErrorCode } from "./errors";
import { requireUser, type SessionUser } from "./session";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

/** `redirect()` and `notFound()` throw; let those pass through untouched. */
function isControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

/**
 * Wraps a Server Action (01-conventions § Server patterns): resolves the user,
 * validates the input with Zod, runs the callback and always returns an
 * `ActionResult` — it never throws to the client.
 */
export function action<S extends z.ZodType, T>(
  schema: S,
  fn: (input: z.infer<S>, user: SessionUser) => Promise<T>,
): (formData: FormData) => Promise<ActionResult<T>> {
  return async (formData) => {
    const user = await requireUser();

    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "INVALID",
          message: strings.errors.invalidForm,
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      };
    }

    try {
      return { ok: true, data: await fn(parsed.data, user) };
    } catch (error) {
      if (isControlFlowError(error)) throw error;
      if (error instanceof AppError) {
        return { ok: false, error: { code: error.code, message: error.message } };
      }
      // Ids only: never log names, emails or notes (AGENTS.md § Privacy in code).
      console.error("action failed:", error instanceof Error ? error.message : error);
      return { ok: false, error: { code: "INVALID", message: strings.errors.unexpected } };
    }
  };
}
