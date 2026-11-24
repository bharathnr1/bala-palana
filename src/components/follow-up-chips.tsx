"use client";

import { addDaysISO, formatDate, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "cn";

const CHOICES = [
  { key: "none", days: null },
  { key: "1w", days: 7 },
  { key: "2w", days: 14 },
  { key: "1m", days: 30 },
] as const;

/**
 * Follow-up choices in one row (04-ui-spec § Shared components): None, 1, 2,
 * 4 weeks, or a date. The parent owns the ISO date.
 */
export function FollowUpChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = todayISO();

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{strings.entries.observe.followUpLabel}</legend>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={strings.entries.observe.followUpLabel}>
        {CHOICES.map((choice) => {
          const iso = choice.days === null ? "" : addDaysISO(today, choice.days);
          const isOn = value === iso;
          return (
            <button
              key={choice.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(iso)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-3 text-sm",
                isOn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
            >
              {strings.entries.observe.followUp[choice.key]}
            </button>
          );
        })}
        <input
          type="date"
          aria-label={strings.entries.observe.followUpPick}
          value={value && !CHOICES.some((c) => c.days !== null && value === addDaysISO(today, c.days)) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
        />
      </div>
      {value ? (
        <p className="text-xs text-muted-foreground">
          {strings.entries.observe.followUpOn(formatDate(value))}
        </p>
      ) : null}
    </fieldset>
  );
}
