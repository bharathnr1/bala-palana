import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { academicYearOf } from "@/lib/academic-year";
import { ADMISSION_EVENT_KINDS, type AdmissionEventKind } from "@/lib/admissions";
import { todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate, type Tx } from "@/server/db/mutate";
import {
  admission,
  admissionEvent,
  appUser,
  child,
  childGuardian,
  enrolment,
  guardian,
  lookup,
  setting,
} from "@/server/db/schema";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalDate = z.preprocess(
  blankToUndefined,
  // `z.iso.date()` also rejects impossible calendar dates like 2026-02-31,
  // which a shape-only regex would pass on to Postgres.
  z.iso.date(strings.admissions.errors.date).optional(),
);

const optionalLookupKey = z.preprocess(blankToUndefined, z.string().trim().max(60).optional());

/** Event kinds a person can add; a stage change goes through `changeStatus`. */
export type EventKind = AdmissionEventKind;

/**
 * An enquiry creates the child as an `applicant`, her guardian and the
 * admission in one transaction (D5: one record for life).
 */
export const createEnquirySchema = z.object({
  fullName: z.string().trim().min(1, strings.admissions.errors.childName).max(200),
  preferredName: optionalText(100),
  dob: optionalDate,
  guardianName: optionalText(200),
  guardianPhone: optionalText(30),
  relationKey: optionalLookupKey,
  enquiryOn: optionalDate,
  sourceKey: optionalLookupKey,
  statusKey: optionalLookupKey,
  nextAction: optionalText(500),
  followUpOn: optionalDate,
  assignedTo: z.preprocess(blankToUndefined, z.uuid().optional()),
});

export const changeStatusSchema = z.object({
  admissionId: z.uuid(),
  statusKey: z.string().trim().min(1).max(60),
  occurredOn: optionalDate,
  note: optionalText(2000),
});

export const addEventSchema = z.object({
  admissionId: z.uuid(),
  kind: z.enum(ADMISSION_EVENT_KINDS),
  occurredOn: optionalDate,
  note: optionalText(2000),
});

export const setNextActionSchema = z.object({
  admissionId: z.uuid(),
  nextAction: optionalText(500),
  followUpOn: optionalDate,
  assignedTo: z.preprocess(blankToUndefined, z.uuid().optional()),
});

export const convertToStudentSchema = z.object({
  admissionId: z.uuid(),
  // The consent checkbox arrives as "on" when ticked and is absent otherwise.
  consent: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  joinedOn: z.iso.date(strings.admissions.errors.date),
  gradeKey: optionalLookupKey,
  groupKey: optionalLookupKey,
  outsideSchool: optionalText(200),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type AddEventInput = z.infer<typeof addEventSchema>;
export type SetNextActionInput = z.infer<typeof setNextActionSchema>;
export type ConvertToStudentInput = z.infer<typeof convertToStudentSchema>;

async function lookupId(tx: Tx, kind: string, key: string, unknown: string): Promise<string> {
  const [row] = await tx
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key), eq(lookup.active, true)))
    .limit(1);
  if (!row) throw new AppError("INVALID", unknown);
  return row.id;
}

/** The academic year a joined date falls in, using the setting's start month (D15). */
async function academicYearFor(tx: Tx, date: string): Promise<string> {
  const [row] = await tx
    .select({ value: setting.value })
    .from(setting)
    .where(eq(setting.key, "academic_year_start_month"))
    .limit(1);
  const startMonth =
    typeof row?.value === "number" && row.value >= 1 && row.value <= 12 ? row.value : 6;
  return academicYearOf(date, startMonth);
}

async function requireAdmission(
  tx: Tx,
  id: string,
): Promise<{ childId: string; interviewOn: string | null }> {
  const [row] = await tx
    .select({ childId: admission.childId, interviewOn: admission.interviewOn })
    .from(admission)
    .where(eq(admission.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.admissions.errors.notFound);
  return row;
}

/** An enquiry may only be owned by someone who can work on admissions. */
async function assertAssignable(tx: Tx, id: string): Promise<void> {
  const [row] = await tx
    .select({ role: appUser.role, active: appUser.active })
    .from(appUser)
    .where(eq(appUser.id, id))
    .limit(1);
  if (!row || !row.active || !can({ role: row.role }, "admission.write")) {
    throw new AppError("INVALID", strings.admissions.errors.assigneeUnknown);
  }
}

/** Writes one event row; the timeline view reads these (M5-01). */
async function insertEvent(
  tx: Tx,
  actorId: string,
  event: {
    admissionId: string;
    kind: EventKind | "status_change";
    occurredOn: string;
    statusId?: string | null;
    note?: string | null;
  },
): Promise<void> {
  await tx.insert(admissionEvent).values({
    admissionId: event.admissionId,
    kind: event.kind,
    occurredOn: event.occurredOn,
    statusId: event.statusId ?? null,
    note: event.note ?? null,
    authorId: actorId,
  });
}

/**
 * Records a stage change and the `status_change` event that goes with it. The
 * two writes share one transaction, so a stage can never move silently.
 */
export async function changeStatus(
  user: SessionUser,
  input: ChangeStatusInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "admission.write");

  return mutate(user, async (tx) => {
    const existing = await requireAdmission(tx, input.admissionId);
    const statusId = await lookupId(
      tx,
      "admission_status",
      input.statusKey,
      strings.admissions.errors.stageUnknown,
    );
    const occurredOn = input.occurredOn ?? todayISO();

    await tx
      .update(admission)
      .set({ statusId, updatedAt: new Date() })
      .where(eq(admission.id, input.admissionId));

    await insertEvent(tx, user.id, {
      admissionId: input.admissionId,
      kind: "status_change",
      occurredOn,
      statusId,
      note: input.note ?? null,
    });

    return { id: input.admissionId, childId: existing.childId };
  });
}

/** Interviews, assessments, activities, observations and notes on one enquiry. */
export async function addEvent(
  user: SessionUser,
  input: AddEventInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "admission.write");

  return mutate(user, async (tx) => {
    const existing = await requireAdmission(tx, input.admissionId);
    const occurredOn = input.occurredOn ?? todayISO();

    await insertEvent(tx, user.id, {
      admissionId: input.admissionId,
      kind: input.kind,
      occurredOn,
      note: input.note ?? null,
    });

    // The admission row keeps the latest interview date, so the board can show
    // it without reading every event. A backfilled earlier interview does not
    // move it backwards.
    if (
      input.kind === "interview" &&
      (!existing.interviewOn || occurredOn > existing.interviewOn)
    ) {
      await tx
        .update(admission)
        .set({ interviewOn: occurredOn, updatedAt: new Date() })
        .where(eq(admission.id, input.admissionId));
    }

    return { id: input.admissionId, childId: existing.childId };
  });
}

/** Sets or clears the owner, the next action and the follow-up date. */
export async function setNextAction(
  user: SessionUser,
  input: SetNextActionInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "admission.write");

  return mutate(user, async (tx) => {
    const existing = await requireAdmission(tx, input.admissionId);
    // A follow-up always has an owner, or nobody would see it on Home. A date
    // without an assignee therefore goes to the person setting it.
    const assignedTo = input.assignedTo ?? (input.followUpOn ? user.id : null);
    if (assignedTo) await assertAssignable(tx, assignedTo);

    await tx
      .update(admission)
      .set({
        nextAction: input.nextAction ?? null,
        followUpOn: input.followUpOn ?? null,
        assignedTo,
        updatedAt: new Date(),
      })
      .where(eq(admission.id, input.admissionId));

    return { id: input.admissionId, childId: existing.childId };
  });
}

/**
 * Creates the applicant, her guardian and the admission (M5-01). The stage
 * defaults to Application received and the enquiry to today (IST).
 */
export async function createEnquiry(
  user: SessionUser,
  input: CreateEnquiryInput,
): Promise<{ childId: string; admissionId: string }> {
  assertCan(user, "admission.write");

  return mutate(user, async (tx) => {
    const [created] = await tx
      .insert(child)
      .values({
        fullName: input.fullName,
        preferredName: input.preferredName ?? null,
        dob: input.dob ?? null,
        stage: "applicant",
      })
      .returning({ id: child.id });
    if (!created) throw new AppError("INVALID", strings.errors.unexpected);

    if (input.guardianName) {
      const relationId = input.relationKey
        ? await lookupId(
            tx,
            "relation",
            input.relationKey,
            strings.admissions.errors.relationUnknown,
          )
        : null;

      const [parent] = await tx
        .insert(guardian)
        .values({ name: input.guardianName, phone: input.guardianPhone ?? null })
        .returning({ id: guardian.id });
      if (!parent) throw new AppError("INVALID", strings.errors.unexpected);

      await tx.insert(childGuardian).values({
        childId: created.id,
        guardianId: parent.id,
        relationId,
        isPrimary: true,
      });
    }

    const statusId = await lookupId(
      tx,
      "admission_status",
      input.statusKey ?? "application_received",
      strings.admissions.errors.stageUnknown,
    );
    const sourceId = input.sourceKey
      ? await lookupId(
          tx,
          "admission_source",
          input.sourceKey,
          strings.admissions.errors.sourceUnknown,
        )
      : null;
    if (input.assignedTo) await assertAssignable(tx, input.assignedTo);
    const enquiryOn = input.enquiryOn ?? todayISO();

    const [saved] = await tx
      .insert(admission)
      .values({
        childId: created.id,
        enquiryOn,
        sourceId,
        statusId,
        nextAction: input.nextAction ?? null,
        followUpOn: input.followUpOn ?? null,
        // The creator owns a new enquiry until someone is assigned, so it
        // reaches her Home list straight away.
        assignedTo: input.assignedTo ?? user.id,
      })
      .returning({ id: admission.id });
    if (!saved) throw new AppError("INVALID", strings.errors.unexpected);

    // The first stage is recorded too, so no stage ever appears without a
    // matching event in the history.
    await insertEvent(tx, user.id, {
      admissionId: saved.id,
      kind: "status_change",
      occurredOn: enquiryOn,
      statusId,
    });

    return { childId: created.id, admissionId: saved.id };
  });
}

/**
 * Converts an applicant into a student (M5-03): records consent, the joined
 * date and the first enrolment, moves the child to `student`, and closes the
 * admission at `selected_as_student` with its stage event — all in one
 * transaction. The admission record survives (D5), so its events stay in the
 * child's Journey.
 */
export async function convertToStudent(
  user: SessionUser,
  input: ConvertToStudentInput,
): Promise<{ id: string; childId: string }> {
  assertCan(user, "admission.write");

  return mutate(user, async (tx) => {
    const existing = await requireAdmission(tx, input.admissionId);
    const [applicant] = await tx
      .select({ stage: child.stage, consentGivenAt: child.consentGivenAt })
      .from(child)
      .where(eq(child.id, existing.childId))
      .limit(1);
    if (!applicant) throw new AppError("NOT_FOUND", strings.children.errors.notFound);
    if (applicant.stage !== "applicant") {
      throw new AppError("INVALID", strings.admissions.errors.notApplicant);
    }
    // Consent is required before a child becomes a student (03 § Rules beyond
    // the matrix). Consent already on file satisfies the gate.
    if (!input.consent && !applicant.consentGivenAt) {
      throw new AppError("INVALID", strings.admissions.errors.consent);
    }

    const statusId = await lookupId(
      tx,
      "admission_status",
      "selected_as_student",
      strings.admissions.errors.stageUnknown,
    );
    const gradeId = input.gradeKey
      ? await lookupId(tx, "grade", input.gradeKey, strings.admissions.errors.gradeUnknown)
      : null;
    const groupId = input.groupKey
      ? await lookupId(tx, "group", input.groupKey, strings.admissions.errors.groupUnknown)
      : null;

    await tx
      .update(child)
      .set({
        stage: "student",
        joinedOn: input.joinedOn,
        consentGivenAt: applicant.consentGivenAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(child.id, existing.childId));

    const academicYear = await academicYearFor(tx, input.joinedOn);
    const outsideSchool = input.outsideSchool ?? null;
    await tx
      .insert(enrolment)
      .values({
        childId: existing.childId,
        academicYear,
        gradeId,
        groupId,
        outsideSchool,
      })
      .onConflictDoUpdate({
        target: [enrolment.childId, enrolment.academicYear],
        set: { gradeId, groupId, outsideSchool },
      });

    await tx
      .update(admission)
      .set({ statusId, updatedAt: new Date() })
      .where(eq(admission.id, input.admissionId));

    await insertEvent(tx, user.id, {
      admissionId: input.admissionId,
      kind: "status_change",
      occurredOn: input.joinedOn,
      statusId,
    });

    return { id: input.admissionId, childId: existing.childId };
  });
}
