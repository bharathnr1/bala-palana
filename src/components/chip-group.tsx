"use client";

import { cn } from "cn";

export type ChipOption = { key: string; label: string };

/**
 * Single- or multi-select chips from a lookup list (04-ui-spec § Shared
 * components). Buttons, not inputs, so a chip never submits the form.
 */
export function ChipGroup({
  id,
  label,
  options,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  options: readonly ChipOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset id={id} className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const isOn = selected.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(option.key)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-3 text-sm",
                isOn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
