"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert } from "@/components/alert";
import { finishAction, startAction } from "@/components/navigation-progress";
import { Button } from "@/components/ui/button";
import { relativeDueLabel } from "@/lib/dates";
import { groupFollowUps, FOLLOW_UP_BUCKETS } from "@/lib/follow-ups";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { changeEntryStatus } from "@/server/entries/actions";
import type { FollowUpRow } from "@/server/follow-ups/queries";

/**
 * Follow-up rows with a Close button (M2-05). Closing removes the row from the
 * local list without a page reload, then refreshes the server data in the
 * background so every other screen agrees.
 */
export function FollowUpList({
  rows,
  emptyLabel = strings.followUps.empty,
}: {
  rows: FollowUpRow[];
  emptyLabel?: string;
}) {
  const [current, setCurrent] = useState(rows);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeRow(row: FollowUpRow): void {
    if (row.kind !== "entry") return;
    const entryId = row.entryId;
    setClosingId(entryId);
    setError(null);
    startAction();
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", entryId);
        formData.set("status", "closed");
        const result = await changeEntryStatus(formData);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setCurrent((list) =>
          list.filter((item) => item.kind !== "entry" || item.entryId !== entryId),
        );
      } finally {
        setClosingId(null);
        finishAction();
      }
    });
  }

  function rowKey(row: FollowUpRow): string {
    return row.kind === "entry" ? `entry-${row.entryId}` : `admission-${row.admissionId}`;
  }

  /** An entry opens its thread; an admission opens the child's Admission tab. */
  function rowHref(row: FollowUpRow): string {
    return row.kind === "entry"
      ? `/children/${row.childId}?tab=journey&entry=${row.entryId}`
      : `/children/${row.childId}?tab=admission`;
  }

  const grouped = groupFollowUps(current);

  if (current.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {FOLLOW_UP_BUCKETS.map((bucket) =>
        grouped[bucket].length === 0 ? null : (
          <section key={bucket} aria-labelledby={`follow-ups-${bucket}`} className="space-y-2">
            <h3
              id={`follow-ups-${bucket}`}
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                bucket === "overdue" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {strings.followUps[bucket]}
            </h3>
            <ul className="space-y-2">
              {grouped[bucket].map((row) => (
                <li
                  key={rowKey(row)}
                  className="flex items-start gap-2 rounded-xl border border-border p-3"
                >
                  <Link href={rowHref(row)} className="min-w-0 flex-1 space-y-0.5">
                    <span className="block truncate font-medium">{row.childName}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[row.categoryLabel, row.note].filter(Boolean).join(" · ")}
                    </span>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs",
                        bucket === "overdue"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {relativeDueLabel(row.followUpOn)}
                    </span>
                  </Link>
                  {row.kind === "entry" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      loading={isPending && closingId === row.entryId}
                      disabled={isPending && closingId !== row.entryId}
                      onClick={() => closeRow(row)}
                      aria-label={strings.followUps.closeLabel(row.childName)}
                    >
                      {isPending && closingId === row.entryId
                        ? strings.followUps.closing
                        : strings.followUps.close}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
