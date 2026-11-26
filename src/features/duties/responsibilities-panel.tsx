import { Star } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { DutyCount, DutyHistoryRow, ResponsibilityRole } from "@/server/duties/profile";

function roleRange(role: ResponsibilityRole): string {
  const from = role.fromOn ? formatDate(role.fromOn) : "";
  if (!role.toOn) return from ? strings.children.roles.since(from) : "";
  return from
    ? strings.children.roles.range(from, formatDate(role.toOn))
    : strings.children.roles.until(formatDate(role.toOn));
}

/**
 * The Responsibilities tab (M3-05): the roles a child holds and held, the
 * cycles served in a chosen academic year, and the duty history by cycle.
 */
export function ResponsibilitiesPanel({
  childId,
  roles,
  counts,
  history,
  year,
  years,
}: {
  childId: string;
  roles: ResponsibilityRole[];
  counts: DutyCount[];
  history: DutyHistoryRow[];
  year: string;
  years: string[];
}) {
  const current = roles.filter((role) => role.isCurrent);
  const past = roles.filter((role) => !role.isCurrent);

  return (
    <div className="space-y-6">
      <section aria-labelledby="roles-current" className="space-y-2">
        <h2 id="roles-current" className="text-sm font-semibold">
          {strings.children.roles.current}
        </h2>
        {current.length === 0 ? (
          <p className="text-sm text-muted-foreground">{strings.children.roles.none}</p>
        ) : (
          <ul className="space-y-1">
            {current.map((role) => (
              <li
                key={role.entryId}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{role.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{roleRange(role)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section aria-labelledby="roles-past" className="space-y-2">
          <h2 id="roles-past" className="text-sm font-semibold">
            {strings.children.roles.past}
          </h2>
          <ul className="space-y-1">
            {past.map((role) => (
              <li
                key={role.entryId}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{role.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{roleRange(role)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="duty-counts" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="duty-counts" className="text-sm font-semibold">
            {strings.children.duties.countsTitle}
          </h2>
          <nav aria-label={strings.children.duties.yearLabel}>
            <ul className="flex gap-2">
              {years.map((option) => (
                <li key={option}>
                  <Link
                    href={`/children/${childId}?tab=responsibilities&year=${option}`}
                    aria-current={option === year ? "page" : undefined}
                    className={
                      option === year
                        ? "inline-flex min-h-11 items-center rounded-full border border-primary bg-primary px-3 text-xs text-primary-foreground"
                        : "inline-flex min-h-11 items-center rounded-full border border-border px-3 text-xs hover:bg-muted"
                    }
                  >
                    {option}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {counts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{strings.children.duties.noCounts}</p>
        ) : (
          <ul className="space-y-1">
            {counts.map((row) => (
              <li
                key={row.dutyId}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{row.dutyLabel}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {strings.children.duties.cycles(row.cyclesServed)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="duty-history" className="space-y-2">
        <h2 id="duty-history" className="text-sm font-semibold">
          {strings.children.duties.historyTitle}
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{strings.children.duties.noHistory}</p>
        ) : (
          <ul className="space-y-1">
            {history.map((row) => (
              <li
                key={row.memberId}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {strings.children.duties.range(
                    formatDate(row.cycleStartOn),
                    formatDate(row.cycleEndOn),
                  )}{" "}
                  · {row.dutyLabel} · {row.teamLabel}
                </span>
                {row.role === "lead" ? (
                  <Star className="size-4 shrink-0 text-primary" aria-label={strings.duties.lead} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
