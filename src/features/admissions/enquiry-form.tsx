"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { createAdmissionEnquiry } from "@/server/admissions/actions";
import type { AdmissionOptions } from "@/server/admissions/queries";

import { Field, INPUT } from "./field";

/**
 * The enquiry form (M5-02): child, guardian and admission in one submit. The
 * action creates all three in one transaction and redirects to the new card.
 */
export function EnquiryForm({
  options,
  today,
}: {
  options: AdmissionOptions;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => createAdmissionEnquiry(formData),
    null,
  );

  const errors = state && !state.ok ? (state.error.fieldErrors ?? {}) : {};
  const message = state && !state.ok ? state.error.message : null;
  const defaultStage = options.statuses[0]?.key ?? "application_received";

  return (
    <form action={formAction} aria-busy={pending} className="max-w-2xl space-y-6">
      {message ? <Alert tone="error">{message}</Alert> : null}

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">
          {strings.admissions.enquiry.childSection}
        </legend>

        <Field
          id="fullName"
          label={strings.admissions.enquiry.fields.fullName}
          error={errors.fullName?.[0]}
        >
          <input id="fullName" name="fullName" required maxLength={200} className={INPUT} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="preferredName"
            label={strings.admissions.enquiry.fields.preferredName}
            error={errors.preferredName?.[0]}
          >
            <input id="preferredName" name="preferredName" maxLength={100} className={INPUT} />
          </Field>

          <Field id="dob" label={strings.admissions.enquiry.fields.dob} error={errors.dob?.[0]}>
            <input id="dob" name="dob" type="date" className={INPUT} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">
          {strings.admissions.enquiry.guardianSection}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="guardianName"
            label={strings.admissions.enquiry.fields.guardianName}
            error={errors.guardianName?.[0]}
          >
            <input id="guardianName" name="guardianName" maxLength={200} className={INPUT} />
          </Field>

          <Field
            id="guardianPhone"
            label={strings.admissions.enquiry.fields.guardianPhone}
            error={errors.guardianPhone?.[0]}
          >
            <input id="guardianPhone" name="guardianPhone" type="tel" maxLength={30} className={INPUT} />
          </Field>

          <Field
            id="relationKey"
            label={strings.admissions.enquiry.fields.relation}
            error={errors.relationKey?.[0]}
          >
            <select id="relationKey" name="relationKey" className={INPUT}>
              <option value="">{strings.admissions.enquiry.fields.none}</option>
              {options.relations.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">
          {strings.admissions.enquiry.enquirySection}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="enquiryOn"
            label={strings.admissions.enquiry.fields.enquiryOn}
            error={errors.enquiryOn?.[0]}
          >
            <input
              id="enquiryOn"
              name="enquiryOn"
              type="date"
              defaultValue={today}
              className={INPUT}
            />
          </Field>

          <Field
            id="sourceKey"
            label={strings.admissions.enquiry.fields.source}
            error={errors.sourceKey?.[0]}
          >
            <select id="sourceKey" name="sourceKey" className={INPUT}>
              <option value="">{strings.admissions.enquiry.fields.none}</option>
              {options.sources.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="statusKey"
            label={strings.admissions.enquiry.fields.stage}
            error={errors.statusKey?.[0]}
          >
            <select
              id="statusKey"
              name="statusKey"
              defaultValue={defaultStage}
              className={INPUT}
            >
              {options.statuses.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="assignedTo"
            label={strings.admissions.enquiry.fields.owner}
            error={errors.assignedTo?.[0]}
          >
            <select id="assignedTo" name="assignedTo" className={INPUT}>
              <option value="">{strings.admissions.enquiry.fields.none}</option>
              {options.assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id="nextAction"
          label={strings.admissions.enquiry.fields.nextAction}
          error={errors.nextAction?.[0]}
        >
          <input id="nextAction" name="nextAction" maxLength={500} className={INPUT} />
        </Field>

        <Field
          id="followUpOn"
          label={strings.admissions.enquiry.fields.followUpOn}
          error={errors.followUpOn?.[0]}
        >
          <input id="followUpOn" name="followUpOn" type="date" className={INPUT} />
        </Field>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <SubmitButton className="h-11" pendingChildren={strings.admissions.enquiry.saving}>
          {strings.admissions.enquiry.save}
        </SubmitButton>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/admissions">{strings.admissions.enquiry.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
