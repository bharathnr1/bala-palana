"use client";

import { CalendarClock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTimeIST } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { groupTimelineByAcademicYear } from "@/lib/timeline";
import { loadTimelinePage } from "@/server/entries/actions";
import type { TimelineEvent } from "@/server/entries/timeline";

import { EntryCard } from "./entry-card";

/**
 * The Journey tab's timeline (M2-03): grouped by academic year, 50 rows at a
 * time. "Show earlier" asks the server for the next page and appends it, so
 * opening a child with years of history stays fast.
 */
export function JourneyTimeline({
  childId,
  events,
  hasMore,
  categoryKey,
  startMonth,
}: {
  childId: string;
  events: TimelineEvent[];
  hasMore: boolean;
  categoryKey?: string;
  startMonth: number;
}) {
  const [rows, setRows] = useState(events);
  const [more, setMore] = useState(hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = groupTimelineByAcademicYear(rows, startMonth);

  function entryHref(id: string): string {
    const params = new URLSearchParams({ tab: "journey", entry: id });
    if (categoryKey) params.set("category", categoryKey);
    return `/children/${childId}?${params.toString()}`;
  }

  async function showEarlier(): Promise<void> {
    const last = rows.at(-1);
    if (!last) return;
    setIsLoading(true);
    setError(null);
    const result = await loadTimelinePage({
      childId,
      before: last.at.toISOString(),
      categoryKey,
    });
    setIsLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRows((current) => [...current, ...result.page.events]);
    setMore(result.page.hasMore);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.academicYear} aria-labelledby={`year-${group.academicYear}`}>
          <h3
            id={`year-${group.academicYear}`}
            className="mb-2 text-sm font-semibold text-muted-foreground"
          >
            {group.academicYear}
          </h3>
          <ul className="space-y-2">
            {group.rows.map((row) =>
              row.kind === "entry" ? (
                <EntryCard key={row.entry.id} entry={row.entry} href={entryHref(row.entry.id)} />
              ) : (
                <li
                  key={`${row.kind}-${row.id}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                >
                  <CalendarClock className="size-4" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {row.kind === "duty"
                      ? strings.entries.timeline.duty
                      : strings.entries.timeline.enrolment}{" "}
                    · {row.title}
                  </span>
                  <span className="shrink-0 text-xs">{formatDateTimeIST(row.at)}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {more ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          loading={isLoading}
          onClick={() => void showEarlier()}
        >
          {isLoading ? strings.entries.timeline.loading : strings.entries.timeline.showEarlier}
        </Button>
      ) : null}
    </div>
  );
}
