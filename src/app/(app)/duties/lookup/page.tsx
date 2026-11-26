import { ArrowLeft, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { dutyChoices, onDutyRoster } from "@/server/duties/queries";

export const metadata: Metadata = { title: strings.duties.lookup };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SELECT = "h-11 w-full rounded-lg border border-input bg-background px-3";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Who was on duty (M3-04). The duty defaults to the first and the date to
 * today, so the common question is answered on opening; changing either and
 * pressing the one button answers any other.
 */
export default async function DutyLookupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("duty.read");
  const params = await searchParams;

  const duties = await dutyChoices(user);
  const requestedDuty = first(params.duty);
  const duty = duties.find((row) => row.id === requestedDuty) ?? duties[0];

  const requestedDate = first(params.date);
  const date = requestedDate && ISO_DATE.test(requestedDate) ? requestedDate : todayISO();

  const roster = duty ? await onDutyRoster(user, duty.id, date) : [];

  return (
    <>
      <PageHeader title={strings.duties.lookup} description={strings.duties.lookupHint} />

      <div className="mb-4">
        <Button asChild variant="ghost" className="h-11">
          <Link href="/duties">
            <ArrowLeft className="size-4" aria-hidden /> {strings.duties.backToBoard}
          </Link>
        </Button>
      </div>

      <form
        method="get"
        action="/duties/lookup"
        className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <label htmlFor="lookup-duty" className="text-sm font-medium">
            {strings.duties.lookupDuty}
          </label>
          <select id="lookup-duty" name="duty" defaultValue={duty?.id ?? ""} className={SELECT}>
            {duties.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="lookup-date" className="text-sm font-medium">
            {strings.duties.lookupOn}
          </label>
          <input
            id="lookup-date"
            type="date"
            name="date"
            defaultValue={date}
            className={SELECT}
          />
        </div>

        <Button type="submit" className="h-11">
          {strings.duties.lookupAsk}
        </Button>
      </form>

      <p className="mb-2 text-sm text-muted-foreground">
        {duty ? `${duty.label} · ${formatDate(date)}` : formatDate(date)}
      </p>

      {roster.length === 0 ? (
        <EmptyState title={strings.duties.lookupEmpty} />
      ) : (
        <ul className="space-y-2">
          {roster.map((row) => (
            <li key={row.childId}>
              <Link
                href={`/children/${row.childId}`}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-border p-3 hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 truncate">{row.childName}</span>
                {row.gradeLabel ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{row.gradeLabel}</span>
                ) : null}
                {row.role === "lead" ? (
                  <Star className="size-4 shrink-0 text-primary" aria-label={strings.duties.lead} />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
