import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate, type Tx } from "@/server/db/mutate";
import { assessment, child, lookup } from "@/server/db/schema";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** A form sends marks as text; blank means "not recorded" (D10). */
const markField = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? value : parsed;
}, z
  .number()
  .min(0, strings.academics.errors.markRange)
  .max(9999.99, strings.academics.errors.markRange)
  .nullable()
  .optional());

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

/**
 * One mark, grade letter or remark (any combination) per child, year, term and
 * subject (D10). Year, grade, term and subject identify the row the upsert
 * targets, so they are required.
 */
export const upsertAssessmentSchema = z
  .object({
    childId: z.uuid(),
    academicYear: z.string().trim().regex(/^\d{4}-\d{2}$/, strings.academics.errors.year),
    gradeKey: z.string().trim().min(1).max(60),
    termKey: z.string().trim().min(1).max(60),
    subjectKey: z.string().trim().min(1).max(60),
    marks: markField,
    maxMarks: markField,
    gradeLetter: optionalText(10),
    remark: optionalText(500),
  })
  .refine(
    (input) =>
      input.marks != null || input.gradeLetter != null || input.remark != null,
    { path: ["marks"], message: strings.academics.errors.emptyValue },
  )
  .refine(
    (input) => input.marks == null || input.maxMarks == null || input.marks <= input.maxMarks,
    { path: ["marks"], message: strings.academics.errors.marksAboveMax },
  );

export const deleteAssessmentSchema = z.object({ id: z.uuid() });

export type UpsertAssessmentInput = z.infer<typeof upsertAssessmentSchema>;
export type DeleteAssessmentInput = z.infer<typeof deleteAssessmentSchema>;

async function lookupIdByKey(tx: Tx, kind: string, key: string): Promise<string> {
  const [row] = await tx
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key), eq(lookup.active, true)))
    .limit(1);
  if (!row) throw new AppError("INVALID", strings.academics.errors.unknownLookup(kind, key));
  return row.id;
}

/** numeric(6,2) travels as a string so stored marks are exact. */
function markValue(value: number | null | undefined): string | null {
  return value == null ? null : value.toFixed(2);
}

/**
 * Saves one row, replacing the previous value for the same child, year, term
 * and subject. `recorded_by` and `updated_at` always name the latest writer.
 */
export async function upsertAssessment(
  user: SessionUser,
  input: UpsertAssessmentInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "assessment.write");

  return mutate(user, async (tx) => {
    const [exists] = await tx
      .select({ id: child.id })
      .from(child)
      .where(eq(child.id, input.childId))
      .limit(1);
    if (!exists) throw new AppError("NOT_FOUND", strings.academics.errors.childMissing);

    const gradeId = await lookupIdByKey(tx, "grade", input.gradeKey);
    const termId = await lookupIdByKey(tx, "term", input.termKey);
    const subjectId = await lookupIdByKey(tx, "subject", input.subjectKey);

    const values = {
      gradeId,
      marks: markValue(input.marks),
      maxMarks: markValue(input.maxMarks),
      gradeLetter: input.gradeLetter ?? null,
      remark: input.remark ?? null,
      recordedBy: user.id,
    };

    const [saved] = await tx
      .insert(assessment)
      .values({
        childId: input.childId,
        academicYear: input.academicYear,
        termId,
        subjectId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          assessment.childId,
          assessment.academicYear,
          assessment.termId,
          assessment.subjectId,
        ],
        set: { ...values, updatedAt: new Date() },
      })
      .returning({ id: assessment.id });

    if (!saved) throw new AppError("INVALID", strings.errors.unexpected);
    return { id: saved.id, childId: input.childId };
  });
}

/** Removes a recorded assessment outright; the audit trigger keeps the trace. */
export async function deleteAssessment(
  user: SessionUser,
  input: DeleteAssessmentInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "assessment.write");

  return mutate(user, async (tx) => {
    const [row] = await tx
      .select({ id: assessment.id, childId: assessment.childId })
      .from(assessment)
      .where(eq(assessment.id, input.id))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", strings.academics.errors.notFound);

    await tx.delete(assessment).where(eq(assessment.id, input.id));
    return { id: row.id, childId: row.childId };
  });
}
