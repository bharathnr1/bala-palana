"use server";

import { z } from "zod";

import { importRowSchema, type ImportSummary } from "@/lib/csv";
import { strings } from "@/lib/strings";
import { action, type ActionResult } from "@/server/auth/action";
import { AppError } from "@/server/auth/errors";

import { importChildren } from "./import";

const runInput = z.object({ rows: z.string().min(2).max(2_000_000) });

/**
 * The preview posts only the rows the admin kept, as JSON. The server
 * re-validates every one of them, so a tampered request cannot skip the
 * schema. Kept out of `import.ts` so client components can import the action
 * without pulling in the database client.
 */
const run = action(runInput, async (input, user) => {
  const parsed = (() => {
    try {
      return JSON.parse(input.rows) as unknown;
    } catch {
      throw new AppError("INVALID", strings.children.import.badPayload);
    }
  })();

  const rows = z.array(importRowSchema).max(5000).safeParse(parsed);
  if (!rows.success) throw new AppError("INVALID", strings.children.import.badPayload);

  return importChildren(user, rows.data);
});

export async function importChildrenAction(formData: FormData): Promise<ActionResult<ImportSummary>> {
  return run(formData);
}
