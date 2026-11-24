"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CHILD_STAGES, consentSatisfied } from "@/lib/children";
import { strings } from "@/lib/strings";
import { action, type ActionResult } from "@/server/auth/action";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import { mutate, type Tx } from "@/server/db/mutate";
import { child, childGuardian, enrolment, guardian, lookup } from "@/server/db/schema";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalDate = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, strings.children.errors.date)
    .optional(),
);

const optionalLookupKey = z.preprocess(blankToUndefined, z.string().max(60).optional());

const childInput = z.object({
  fullName: z.string().trim().min(1).max(200),
  preferredName: optionalText(100),
  dob: optionalDate,
  stage: z.enum(CHILD_STAGES),
  joinedOn: optionalDate,
  notes: optionalText(2000),
  // A checkbox arrives as "on" when ticked and is absent otherwise.
  consent: z.preprocess((value) => value === "on" || value === true, z.boolean()),

  guardianName: optionalText(200),
  guardianPhone: optionalText(30),
  relationKey: optionalLookupKey,

  academicYear: z.preprocess(
    blankToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}$/, strings.children.errors.date)
      .optional(),
  ),
  gradeKey: optionalLookupKey,
  groupKey: optionalLookupKey,
  outsideSchool: optionalText(200),
});

const updateInput = childInput.extend({ id: z.uuid() });

type ChildInput = z.infer<typeof childInput>;

async function lookupId(tx: Tx, kind: string, key: string | undefined): Promise<string | null> {
  if (!key) return null;
  const [row] = await tx
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key)))
    .limit(1);
  return row?.id ?? null;
}

/** Consent is required before a child becomes a student (03 § Rules beyond the matrix). */
function assertConsent(input: ChildInput, alreadyRecorded: Date | null): void {
  if (!consentSatisfied(input, alreadyRecorded)) {
    throw new AppError("INVALID", strings.children.errors.consent);
  }
}

async function saveEnrolment(tx: Tx, childId: string, input: ChildInput): Promise<void> {
  if (!input.academicYear) return;

  const gradeId = await lookupId(tx, "grade", input.gradeKey);
  const groupId = await lookupId(tx, "group", input.groupKey);
  if (!gradeId && !groupId && !input.outsideSchool) return;

  const values = {
    childId,
    academicYear: input.academicYear,
    gradeId,
    groupId,
    outsideSchool: input.outsideSchool ?? null,
  };

  await tx
    .insert(enrolment)
    .values(values)
    .onConflictDoUpdate({
      target: [enrolment.childId, enrolment.academicYear],
      set: { gradeId, groupId, outsideSchool: values.outsideSchool },
    });
}

async function savePrimaryGuardian(tx: Tx, childId: string, input: ChildInput): Promise<void> {
  const relationId = await lookupId(tx, "relation", input.relationKey);

  const [existing] = await tx
    .select({ id: guardian.id })
    .from(childGuardian)
    .innerJoin(guardian, eq(guardian.id, childGuardian.guardianId))
    .where(and(eq(childGuardian.childId, childId), eq(childGuardian.isPrimary, true)))
    .limit(1);

  if (existing) {
    if (!input.guardianName) return;
    await tx
      .update(guardian)
      .set({ name: input.guardianName, phone: input.guardianPhone ?? null })
      .where(eq(guardian.id, existing.id));
    await tx
      .update(childGuardian)
      .set({ relationId })
      .where(and(eq(childGuardian.childId, childId), eq(childGuardian.guardianId, existing.id)));
    return;
  }

  if (!input.guardianName) return;
  const [created] = await tx
    .insert(guardian)
    .values({ name: input.guardianName, phone: input.guardianPhone ?? null })
    .returning({ id: guardian.id });
  if (!created) throw new AppError("INVALID", strings.errors.unexpected);

  await tx
    .insert(childGuardian)
    .values({ childId, guardianId: created.id, relationId, isPrimary: true });
}

const create = action(childInput, async (input, user) => {
  assertCan(user, "child.write");
  assertConsent(input, null);

  const id = await mutate(user, async (tx) => {
    const [created] = await tx
      .insert(child)
      .values({
        fullName: input.fullName,
        preferredName: input.preferredName ?? null,
        dob: input.dob ?? null,
        stage: input.stage,
        joinedOn: input.joinedOn ?? null,
        notes: input.notes ?? null,
        consentGivenAt: input.consent ? new Date() : null,
      })
      .returning({ id: child.id });
    if (!created) throw new AppError("INVALID", strings.errors.unexpected);

    await savePrimaryGuardian(tx, created.id, input);
    await saveEnrolment(tx, created.id, input);
    return created.id;
  });

  revalidatePath("/children");
  redirect(`/children/${id}`);
});

const update = action(updateInput, async (input, user) => {
  assertCan(user, "child.write");

  const id = await mutate(user, async (tx) => {
    const [existing] = await tx
      .select({ consentGivenAt: child.consentGivenAt })
      .from(child)
      .where(eq(child.id, input.id))
      .limit(1);
    if (!existing) throw new AppError("NOT_FOUND", strings.children.errors.notFound);

    assertConsent(input, existing.consentGivenAt);

    await tx
      .update(child)
      .set({
        fullName: input.fullName,
        preferredName: input.preferredName ?? null,
        dob: input.dob ?? null,
        stage: input.stage,
        joinedOn: input.joinedOn ?? null,
        notes: input.notes ?? null,
        ...(input.consent ? { consentGivenAt: existing.consentGivenAt ?? new Date() } : {}),
      })
      .where(eq(child.id, input.id));

    await savePrimaryGuardian(tx, input.id, input);
    await saveEnrolment(tx, input.id, input);
    return input.id;
  });

  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
  redirect(`/children/${id}`);
});

/** Form entry points; the wrapper above owns the validation and the guard. */
export async function createChild(formData: FormData): Promise<ActionResult<string>> {
  return create(formData);
}

export async function updateChild(formData: FormData): Promise<ActionResult<string>> {
  return update(formData);
}
