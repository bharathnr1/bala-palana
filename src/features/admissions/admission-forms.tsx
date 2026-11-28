"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { ADMISSION_EVENT_KINDS } from "@/lib/admissions";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import {
  addAdmissionEvent,
  changeAdmissionStatus,
  convertAdmissionToStudent,
  setAdmissionNextAction,
} from "@/server/admissions/actions";
import type { StatusOption } from "@/server/admissions/queries";

import { Field, INPUT } from "./field";

type Action = (formData: FormData) => Promise<ActionResult<unknown>>;

/** `useActionState` plus the one-line error/success display all three forms share. */
function useAdmissionForm(action: Action) {
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => action(formData),
    null,
  );
  const errors = state && !state.ok ? (state.error.fieldErrors ?? {}) : {};
  const error = state && !state.ok ? state.error.message : null;
  const saved = state?.ok === true;
  return { formAction, pending, errors, error, saved };
}

function FormFeedback({
  error,
  saved,
}: {
  error: string | null;
  saved: boolean;
}) {
  if (error) return <Alert tone="error">{error}</Alert>;
  if (saved) return <Alert tone="success">{strings.admissions.detail.saved}</Alert>;
  return null;
}

/** Interview, assessment, activity, observation or note on the enquiry. */
export function AddEventForm({ admissionId }: { admissionId: string }) {
  const { formAction, pending, errors, error, saved } = useAdmissionForm(addAdmissionEvent);
  const formRef = useRef<HTMLFormElement>(null);

  // A saved event clears the note and date, so the next one starts blank.
  useEffect(() => {
    if (saved) formRef.current?.reset();
  }, [saved]);

  return (
    <form ref={formRef} action={formAction} aria-busy={pending} className="space-y-3">
      <h2 className="text-sm font-semibold">{strings.admissions.detail.addEvent}</h2>
      <FormFeedback error={error} saved={saved} />
      <input type="hidden" name="admissionId" value={admissionId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="eventKind" label={strings.admissions.detail.kind} error={errors.kind?.[0]}>
          <select id="eventKind" name="kind" className={INPUT} defaultValue="interview">
            {ADMISSION_EVENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {strings.admissions.eventKinds[kind]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="eventDate"
          label={strings.admissions.detail.date}
          hint={strings.admissions.detail.optional}
          error={errors.occurredOn?.[0]}
        >
          <input id="eventDate" name="occurredOn" type="date" className={INPUT} />
        </Field>
      </div>

      <Field
        id="eventNote"
        label={strings.admissions.detail.note}
        hint={strings.admissions.detail.optional}
        error={errors.note?.[0]}
      >
        <textarea
          id="eventNote"
          name="note"
          rows={2}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background p-3"
        />
      </Field>

      <SubmitButton className="h-11" pendingChildren={strings.admissions.detail.saving}>
        {strings.admissions.detail.save}
      </SubmitButton>
    </form>
  );
}

/** Moves the enquiry to another stage; the server logs the matching event. */
export function ChangeStatusForm({
  admissionId,
  statuses,
  currentStatusKey,
}: {
  admissionId: string;
  statuses: StatusOption[];
  currentStatusKey: string;
}) {
  const { formAction, pending, errors, error, saved } = useAdmissionForm(changeAdmissionStatus);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-3">
      <h2 className="text-sm font-semibold">{strings.admissions.detail.changeStatus}</h2>
      <FormFeedback error={error} saved={saved} />
      <input type="hidden" name="admissionId" value={admissionId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="statusKey" label={strings.admissions.detail.stage} error={errors.statusKey?.[0]}>
          <select id="statusKey" name="statusKey" className={INPUT} defaultValue={currentStatusKey}>
            {statuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="statusDate"
          label={strings.admissions.detail.date}
          hint={strings.admissions.detail.optional}
          error={errors.occurredOn?.[0]}
        >
          <input id="statusDate" name="occurredOn" type="date" className={INPUT} />
        </Field>
      </div>

      <Field
        id="statusNote"
        label={strings.admissions.detail.note}
        hint={strings.admissions.detail.optional}
        error={errors.note?.[0]}
      >
        <textarea
          id="statusNote"
          name="note"
          rows={2}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background p-3"
        />
      </Field>

      <SubmitButton className="h-11" pendingChildren={strings.admissions.detail.saving}>
        {strings.admissions.detail.save}
      </SubmitButton>
    </form>
  );
}

/** The next action, when it is due, and who owns it. */
export function NextActionForm({
  admissionId,
  nextAction,
  followUpOn,
  assignedTo,
  assignees,
}: {
  admissionId: string;
  nextAction: string | null;
  followUpOn: string | null;
  assignedTo: string | null;
  assignees: { id: string; name: string }[];
}) {
  const { formAction, pending, errors, error, saved } = useAdmissionForm(setAdmissionNextAction);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-3">
      <h2 className="text-sm font-semibold">{strings.admissions.detail.setNextAction}</h2>
      <FormFeedback error={error} saved={saved} />
      <input type="hidden" name="admissionId" value={admissionId} />

      <Field
        id="nextAction"
        label={strings.admissions.detail.nextAction}
        hint={strings.admissions.detail.optional}
        error={errors.nextAction?.[0]}
      >
        <input
          id="nextAction"
          name="nextAction"
          maxLength={500}
          defaultValue={nextAction ?? ""}
          className={INPUT}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="followUpOn"
          label={strings.admissions.detail.followUpOn}
          hint={strings.admissions.detail.followUpHint}
          error={errors.followUpOn?.[0]}
        >
          <input
            id="followUpOn"
            name="followUpOn"
            type="date"
            defaultValue={followUpOn ?? ""}
            className={INPUT}
          />
        </Field>

        <Field
          id="assignedTo"
          label={strings.admissions.detail.assignee}
          error={errors.assignedTo?.[0]}
        >
          <select id="assignedTo" name="assignedTo" className={INPUT} defaultValue={assignedTo ?? ""}>
            <option value="">{strings.admissions.detail.unassigned}</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <SubmitButton className="h-11" pendingChildren={strings.admissions.detail.saving}>
        {strings.admissions.detail.save}
      </SubmitButton>
    </form>
  );
}

type LookupChoice = { key: string; label: string };

/**
 * Converts an applicant into a student (M5-03): consent, joined date, grade and
 * the outside school. The server records the first enrolment and closes the
 * admission at `selected_as_student` in one transaction.
 */
export function ConvertToStudentForm({
  admissionId,
  today,
  grades,
  groups,
  consentRecorded,
}: {
  admissionId: string;
  today: string;
  grades: LookupChoice[];
  groups: LookupChoice[];
  consentRecorded: boolean;
}) {
  const { formAction, pending, errors, error, saved } =
    useAdmissionForm(convertAdmissionToStudent);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-3">
      <h2 className="text-sm font-semibold">{strings.admissions.convert.title}</h2>
      <FormFeedback error={error} saved={saved} />
      <input type="hidden" name="admissionId" value={admissionId} />

      <label className="bg-secondary flex items-start gap-3 rounded-lg p-3">
        <input
          type="checkbox"
          name="consent"
          defaultChecked={consentRecorded}
          className="mt-0.5 size-5"
        />
        <span>
          <span className="block text-sm font-medium">{strings.admissions.convert.consent}</span>
          <span className="block text-xs text-muted-foreground">
            {strings.admissions.convert.consentHint}
          </span>
        </span>
      </label>
      {errors.consent?.[0] ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.consent[0]}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="joinedOn"
          label={strings.admissions.convert.joinedOn}
          error={errors.joinedOn?.[0]}
        >
          <input
            id="joinedOn"
            name="joinedOn"
            type="date"
            required
            defaultValue={today}
            className={INPUT}
          />
        </Field>

        <Field id="gradeKey" label={strings.admissions.convert.grade} error={errors.gradeKey?.[0]}>
          <select id="gradeKey" name="gradeKey" className={INPUT}>
            <option value="">{strings.admissions.enquiry.fields.none}</option>
            {grades.map((grade) => (
              <option key={grade.key} value={grade.key}>
                {grade.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="groupKey" label={strings.admissions.convert.group} error={errors.groupKey?.[0]}>
          <select id="groupKey" name="groupKey" className={INPUT}>
            <option value="">{strings.admissions.enquiry.fields.none}</option>
            {groups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="outsideSchool"
          label={strings.admissions.convert.outsideSchool}
          error={errors.outsideSchool?.[0]}
        >
          <input id="outsideSchool" name="outsideSchool" maxLength={200} className={INPUT} />
        </Field>
      </div>

      <SubmitButton className="h-11" pendingChildren={strings.admissions.convert.saving}>
        {strings.admissions.convert.save}
      </SubmitButton>
    </form>
  );
}
