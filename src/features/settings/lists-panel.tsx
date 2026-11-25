import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { humaniseKey } from "@/lib/settings";
import { strings } from "@/lib/strings";
import {
  addLookupForm,
  moveLookupForm,
  renameLookupForm,
  setLookupActiveForm,
} from "@/server/settings/actions";
import type { LookupRow } from "@/server/settings/queries";

const INPUT = "h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3";

/**
 * Lists: one tab per lookup kind, with add/rename/reorder/deactivate (D7).
 * Plain forms, so every control works without client JavaScript.
 */
export function ListsPanel({
  kinds,
  activeKind,
  rows,
}: {
  kinds: string[];
  activeKind: string;
  rows: LookupRow[];
}) {
  return (
    <div className="space-y-4">
      <nav aria-label={strings.settings.tabs.lists}>
        <ul className="flex gap-1 overflow-x-auto border-b border-border">
          {kinds.map((kind) => {
            const isActive = kind === activeKind;
            return (
              <li key={kind} className="shrink-0">
                <Link
                  href={`/settings?tab=lists&kind=${kind}`}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "-mb-px block border-b-2 border-primary px-3 py-3 text-sm font-medium"
                      : "block px-3 py-3 text-sm text-muted-foreground hover:text-foreground"
                  }
                >
                  {humaniseKey(kind)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form action={addLookupForm} className="flex gap-2">
        <input type="hidden" name="kind" value={activeKind} />
        <input
          name="label"
          required
          maxLength={120}
          placeholder={strings.settings.lists.addPlaceholder}
          aria-label={strings.settings.lists.addPlaceholder}
          className={INPUT}
        />
        <SubmitButton className="h-11" pendingChildren={strings.settings.lists.adding}>
          {strings.settings.lists.add}
        </SubmitButton>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{strings.settings.lists.empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2"
            >
              <form action={renameLookupForm} className="flex w-full min-w-0 gap-2 sm:w-auto sm:flex-1">
                <input type="hidden" name="id" value={row.id} />
                <input
                  name="label"
                  defaultValue={row.label}
                  aria-label={strings.settings.lists.label}
                  maxLength={120}
                  className={INPUT}
                />
                <SubmitButton
                  variant="outline"
                  className="h-11"
                  pendingChildren={strings.settings.lists.saving}
                >
                  {strings.settings.lists.save}
                </SubmitButton>
              </form>

              {row.active ? null : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {strings.settings.lists.inactiveSuffix}
                </span>
              )}

              <div className="flex gap-1">
                <form action={moveLookupForm}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton
                    variant="ghost"
                    className="h-11 w-11"
                    disabled={index === 0}
                    aria-label={strings.settings.lists.moveUp}
                    iconOnly
                  >
                    <ChevronUp className="size-5" aria-hidden />
                  </SubmitButton>
                </form>
                <form action={moveLookupForm}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton
                    variant="ghost"
                    className="h-11 w-11"
                    disabled={index === rows.length - 1}
                    aria-label={strings.settings.lists.moveDown}
                    iconOnly
                  >
                    <ChevronDown className="size-5" aria-hidden />
                  </SubmitButton>
                </form>
              </div>

              <form action={setLookupActiveForm}>
                <input type="hidden" name="id" value={row.id} />
                {row.active ? null : <input type="hidden" name="active" value="on" />}
                <SubmitButton variant="ghost" className="h-11">
                  {row.active ? strings.settings.lists.deactivate : strings.settings.lists.reactivate}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
