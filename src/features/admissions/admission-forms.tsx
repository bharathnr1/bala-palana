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
