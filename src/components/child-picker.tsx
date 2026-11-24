"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "cn";

import { ChildAvatar } from "@/components/child-avatar";
import {
  recentChildrenServerSnapshot,
  recentChildrenSnapshot,
  subscribeRecentChildren,
} from "@/lib/recent-children";
import { strings } from "@/lib/strings";

export type PickerChild = {
  id: string;
  fullName: string;
  gradeLabel: string | null;
  groupLabel: string | null;
};

const MAX_RESULTS = 50;

/**
 * Search-and-tap child selection (04-ui-spec § Shared components). Multi-select;
 * the parent owns the selection. The list is bounded (students and applicants),
 * so the search runs in the browser and stays instant.
 */
export function ChildPicker({
  childList,
  selected,
  onToggle,
}: {
  childList: readonly PickerChild[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const recent = useSyncExternalStore(
    subscribeRecentChildren,
    recentChildrenSnapshot,
    recentChildrenServerSnapshot,
  );

  const byId = useMemo(() => new Map(childList.map((row) => [row.id, row])), [childList]);
  const term = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      (term ? childList.filter((row) => row.fullName.toLowerCase().includes(term)) : childList).slice(
        0,
        MAX_RESULTS,
      ),
    [childList, term],
  );

  const selectedRows = selected
    .map((id) => byId.get(id))
    .filter((row): row is PickerChild => row !== undefined);
  const recentRows = recent
    .map((row) => byId.get(row.id))
    .filter((row): row is PickerChild => row !== undefined && !selected.includes(row.id))
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="observer-child-search" className="text-sm font-medium">
          {strings.entries.observe.children}
        </label>
        <input
          id="observer-child-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={strings.entries.observe.searchChildren}
          className="h-11 w-full rounded-lg border border-input bg-background px-3"
        />
      </div>

      {selectedRows.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{strings.entries.observe.selected}</p>
          <ul className="flex flex-wrap gap-2">
            {selectedRows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onToggle(row.id)}
                  aria-label={`${strings.entries.observe.remove}: ${row.fullName}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary bg-primary/10 py-1 pr-3 pl-1 text-sm"
                >
                  <ChildAvatar name={row.fullName} className="size-7 text-[0.6rem]" />
                  {row.fullName}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recentRows.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{strings.entries.observe.recent}</p>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {recentRows.map((row) => (
              <li key={row.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onToggle(row.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm"
                >
                  <ChildAvatar name={row.fullName} className="size-7 text-[0.6rem]" />
                  {row.fullName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {matches.map((row) => {
          const isOn = selected.includes(row.id);
          const subtitle = [row.gradeLabel, row.groupLabel].filter(Boolean).join(" · ");
          return (
            <li key={row.id}>
              <button
                type="button"
                aria-pressed={isOn}
                onClick={() => onToggle(row.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  isOn ? "bg-secondary" : "bg-background hover:bg-muted",
                )}
              >
                <ChildAvatar name={row.fullName} className="size-8 text-xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.fullName}</span>
                  {subtitle ? (
                    <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
                  ) : null}
                </span>
                {isOn ? <span aria-hidden="true">✓</span> : null}
              </button>
            </li>
          );
        })}
        {matches.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted-foreground">
            {strings.entries.observe.noMatches}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
