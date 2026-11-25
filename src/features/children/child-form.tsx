"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { CHILD_STAGES, type ChildStage } from "@/lib/children";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";

export type ChildFormValues = {
  id?: string;
  fullName: string;
  preferredName: string;
  dob: string;
  stage: ChildStage;
  joinedOn: string;
  notes: string;
  consentGivenAt: boolean;
  guardianName: string;
  guardianPhone: string;
  relationKey: string;
  academicYear: string;
  gradeKey: string;
  groupKey: string;
  outsideSchool: string;
};

type Option = { id: string; key: string; label: string };

const INPUT = "h-11 w-full rounded-lg border border-input bg-background px-3";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One form for add and edit (M0-08). The action is a Server Action passed by
 * the page, so the same markup serves both; errors come back from `action()`
 * and are shown against their field.
 */
export function ChildForm({
  action,
  values,
  options,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<ActionResult<string>>;
  values: ChildFormValues;
  options: { grades: Option[]; groups: Option[]; relations: Option[] };
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    (_previous: ActionResult<string> | null, formData: FormData) => action(formData),
    null,
  );
  const [stage, setStage] = useState<ChildStage>(values.stage);

  const errors = state && !state.ok ? (state.error.fieldErrors ?? {}) : {};
  const message = state && !state.ok ? state.error.message : null;

  return (
    <form action={formAction} aria-busy={pending} className="max-w-2xl space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {message ? <Alert tone="error">{message}</Alert> : null}

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{strings.children.basicSection}</legend>

        <Field id="fullName" label={strings.children.fields.fullName} error={errors.fullName?.[0]}>
          <input
            id="fullName"
            name="fullName"
            required
            maxLength={200}
            defaultValue={values.fullName}
            className={INPUT}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="preferredName"
            label={strings.children.fields.preferredName}
            error={errors.preferredName?.[0]}
          >
            <input
              id="preferredName"
              name="preferredName"
              maxLength={100}
              defaultValue={values.preferredName}
              className={INPUT}
            />
          </Field>

          <Field id="dob" label={strings.children.fields.dob} error={errors.dob?.[0]}>
            <input id="dob" name="dob" type="date" defaultValue={values.dob} className={INPUT} />
          </Field>

          <Field id="stage" label={strings.children.fields.stage} error={errors.stage?.[0]}>
            <select
              id="stage"
              name="stage"
              value={stage}
              onChange={(event) => setStage(event.target.value as ChildStage)}
              className={INPUT}
            >
              {CHILD_STAGES.map((option) => (
                <option key={option} value={option}>
                  {strings.children.stage[option]}
                </option>
              ))}
            </select>
          </Field>

          <Field id="joinedOn" label={strings.children.fields.joinedOn} error={errors.joinedOn?.[0]}>
            <input
              id="joinedOn"
              name="joinedOn"
              type="date"
              defaultValue={values.joinedOn}
              className={INPUT}
            />
          </Field>
        </div>

        {stage === "student" ? (
          <label className="flex items-start gap-3 rounded-lg bg-secondary p-3">
            <input
              type="checkbox"
              name="consent"
              defaultChecked={values.consentGivenAt}
              className="mt-0.5 size-5"
            />
            <span>
              <span className="text-sm font-medium">{strings.children.fields.consent}</span>
              <span className="block text-xs text-muted-foreground">
                {strings.children.fields.consentHint}
              </span>
            </span>
          </label>
        ) : null}

        <Field id="notes" label={strings.children.fields.notes} error={errors.notes?.[0]}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={values.notes}
            className="w-full rounded-lg border border-input bg-background p-3"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{strings.children.guardianSection}</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="guardianName"
            label={strings.children.fields.guardianName}
            error={errors.guardianName?.[0]}
          >
            <input
              id="guardianName"
              name="guardianName"
              maxLength={200}
              defaultValue={values.guardianName}
              className={INPUT}
            />
          </Field>

          <Field
            id="guardianPhone"
            label={strings.children.fields.guardianPhone}
            error={errors.guardianPhone?.[0]}
          >
            <input
              id="guardianPhone"
              name="guardianPhone"
              type="tel"
              maxLength={30}
              defaultValue={values.guardianPhone}
              className={INPUT}
            />
          </Field>

          <Field id="relationKey" label={strings.children.fields.relation} error={errors.relationKey?.[0]}>
            <select
              id="relationKey"
              name="relationKey"
              defaultValue={values.relationKey}
              className={INPUT}
            >
              <option value="">{strings.children.fields.none}</option>
              {options.relations.map((option) => (
                <option key={option.id} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{strings.children.enrolmentSection}</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="academicYear"
            label={strings.children.fields.academicYear}
            hint={strings.children.fields.yearHint}
            error={errors.academicYear?.[0]}
          >
            <input
              id="academicYear"
              name="academicYear"
              maxLength={7}
              defaultValue={values.academicYear}
              className={INPUT}
            />
          </Field>

          <Field id="gradeKey" label={strings.children.fields.grade} error={errors.gradeKey?.[0]}>
            <select id="gradeKey" name="gradeKey" defaultValue={values.gradeKey} className={INPUT}>
              <option value="">{strings.children.fields.none}</option>
              {options.grades.map((option) => (
                <option key={option.id} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field id="groupKey" label={strings.children.fields.group} error={errors.groupKey?.[0]}>
            <select id="groupKey" name="groupKey" defaultValue={values.groupKey} className={INPUT}>
              <option value="">{strings.children.fields.none}</option>
              {options.groups.map((option) => (
                <option key={option.id} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="outsideSchool"
            label={strings.children.fields.outsideSchool}
            error={errors.outsideSchool?.[0]}
          >
            <input
              id="outsideSchool"
              name="outsideSchool"
              maxLength={200}
              defaultValue={values.outsideSchool}
              className={INPUT}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11" loading={pending}>
          {pending ? strings.children.saving : strings.children.save}
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href={cancelHref}>{strings.children.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
