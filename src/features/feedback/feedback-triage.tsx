"use client";

import { useActionState } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { triageFeedbackAction } from "@/server/feedback/actions";

/** The admin-only triage form on a feedback card (M1-03). */
export function FeedbackTriage({
  id,
  status,
  note,
}: {
  id: string;
  status: FeedbackStatus;
  note: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    (_previous: ActionResult<{ id: string }> | null, formData: FormData) =>
      triageFeedbackAction(formData),
    null,
  );

  return (
    <form action={formAction} className="border-border space-y-2 border-t pt-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium">{strings.feedback.list.triage.title}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <label htmlFor={`status-${id}`} className="text-muted-foreground block text-xs">
            {strings.feedback.list.triage.status}
          </label>
          <select
            id={`status-${id}`}
            name="status"
            defaultValue={status}
            className="border-input bg-background h-11 rounded-lg border px-2"
          >
            {FEEDBACK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {strings.feedback.list.statuses[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`note-${id}`} className="text-muted-foreground block text-xs">
            {strings.feedback.list.triage.note}
          </label>
          <textarea
            id={`note-${id}`}
            name="triageNote"
            defaultValue={note ?? ""}
            placeholder={strings.feedback.list.triage.notePlaceholder}
            maxLength={2000}
            rows={2}
            className="border-input bg-background w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <Button type="submit" variant="outline" className="h-11" loading={pending}>
        {pending ? strings.feedback.list.triage.saving : strings.feedback.list.triage.save}
      </Button>

      {state?.ok ? <Alert tone="success">{strings.feedback.list.triage.saved}</Alert> : null}
      {state && !state.ok ? <Alert tone="error">{state.error.message}</Alert> : null}
    </form>
  );
}
