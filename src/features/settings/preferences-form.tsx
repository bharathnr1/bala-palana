"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { Preferences } from "@/lib/settings";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { savePreferencesAction } from "@/server/settings/actions";

const INPUT = "h-11 w-full rounded-lg border border-input bg-background px-3";

/** The four settings from 02-schema § Seeds, with server-side validation. */
export function PreferencesForm({ values }: { values: Preferences }) {
  const [state, formAction, pending] = useActionState(
    (_previous: ActionResult<Preferences> | null, formData: FormData) =>
      savePreferencesAction(formData),
    null,
  );

  const errors = state && !state.ok ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state && !state.ok ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}

      {state?.ok ? (
        <p role="status" className="rounded-lg bg-secondary px-3 py-2 text-sm">
          {strings.settings.preferences.saved}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="academicYearStartMonth" className="text-sm font-medium">
          {strings.settings.preferences.academicYearStartMonth}
        </label>
        <select
          id="academicYearStartMonth"
          name="academicYearStartMonth"
          defaultValue={values.academicYearStartMonth}
          className={INPUT}
        >
          {strings.settings.preferences.months.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
        {errors.academicYearStartMonth ? (
          <p className="text-xs text-destructive">{errors.academicYearStartMonth[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="cycleRule" className="text-sm font-medium">
          {strings.settings.preferences.cycleRule}
        </label>
        <select
          id="cycleRule"
          name="cycleRule"
          defaultValue={values.cycleRule}
          className={INPUT}
        >
          {Object.entries(strings.settings.preferences.cycleRules).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="needsAttentionDays" className="text-sm font-medium">
          {strings.settings.preferences.needsAttentionDays}
        </label>
        <input
          id="needsAttentionDays"
          name="needsAttentionDays"
          type="number"
          min={1}
          max={365}
          defaultValue={values.needsAttentionDays}
          className={INPUT}
        />
        {errors.needsAttentionDays ? (
          <p className="text-xs text-destructive">{errors.needsAttentionDays[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="audioRetentionDays" className="text-sm font-medium">
          {strings.settings.preferences.audioRetentionDays}
        </label>
        <input
          id="audioRetentionDays"
          name="audioRetentionDays"
          type="number"
          min={1}
          max={3650}
          defaultValue={values.audioRetentionDays}
          className={INPUT}
        />
        {errors.audioRetentionDays ? (
          <p className="text-xs text-destructive">{errors.audioRetentionDays[0]}</p>
        ) : null}
      </div>

      <Button type="submit" className="h-11" disabled={pending}>
        {strings.settings.preferences.save}
      </Button>
    </form>
  );
}
