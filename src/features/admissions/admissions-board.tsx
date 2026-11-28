import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue, relativeDueLabel } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { AdmissionCard, AdmissionColumn } from "@/server/admissions/queries";

function boardHref(statusKey: string | null, showTerminal: boolean): string {
  const params = new URLSearchParams();
  if (statusKey) params.set("status", statusKey);
  if (showTerminal) params.set("terminal", "1");
  const query = params.toString();
  return query ? `/admissions?${query}` : "/admissions";
}

function tabClass(isActive: boolean): string {
  return isActive
    ? "inline-flex min-h-11 items-center gap-2 rounded-full border border-primary bg-primary px-3 text-sm text-primary-foreground"
    : "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm hover:bg-muted";
}

function countBadgeClass(isActive: boolean): string {
  return isActive ? "rounded-full bg-primary-foreground/20 px-1.5" : "rounded-full bg-muted px-1.5";
}

/** One enquiry as the board shows it: who, when, what is next, and when. */
function Card({ card, statusLabel }: { card: AdmissionCard; statusLabel: string }) {
  const overdue = card.followUpOn ? isOverdue(card.followUpOn) : false;

  return (
    <Link
      href={`/admissions/${card.id}`}
      aria-label={strings.admissions.board.cardLabel(card.childName, statusLabel)}
      className="block space-y-1 rounded-xl border border-border bg-background p-3 hover:bg-muted"
    >
      <span className="block truncate font-medium">{card.childName}</span>
      <span className="block text-xs text-muted-foreground">
        {strings.admissions.board.enquiryOn(formatDate(card.enquiryOn))}
      </span>
      {card.nextAction ? (
        <span className="block text-sm">{card.nextAction}</span>
      ) : (
        <span className="block text-sm text-muted-foreground">
          {strings.admissions.board.noNextAction}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        {card.followUpOn ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5",
              overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            {relativeDueLabel(card.followUpOn)}
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {card.assignedToName ?? strings.admissions.board.unassigned}
        </span>
      </span>
    </Link>
  );
}

/** The whole board is empty: one message and a way to start. */
function EmptyBoard({ canWrite }: { canWrite: boolean }) {
  return (
    <EmptyState
      title={strings.admissions.board.emptyTitle}
      description={strings.admissions.board.emptyBody}
      action={
        canWrite ? (
          <Button asChild className="h-11">
            <Link href="/admissions/new">{strings.admissions.board.newEnquiry}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}

/**
 * Admissions board (M5-02). Mobile shows stage tabs with counts and one list;
 * desktop shows every stage as a kanban column. Terminal stages are collapsed
 * to their heading until `?terminal=1` asks for them.
 */
export function AdmissionsBoard({
  columns,
  activeStatusKey,
  showTerminal,
  canWrite,
}: {
  columns: AdmissionColumn[];
  activeStatusKey: string | undefined;
  showTerminal: boolean;
  canWrite: boolean;
}) {
  const total = columns.reduce((sum, column) => sum + column.count, 0);
  if (total === 0) return <EmptyBoard canWrite={canWrite} />;

  const terminal = columns.filter((column) => column.isTerminal);
  const terminalCount = terminal.reduce((sum, column) => sum + column.count, 0);
  const visibleColumns = columns.filter((column) => !column.isTerminal || showTerminal);
  // Prefer the requested stage, then the first stage that has work in it, so a
  // mobile reader does not land on an empty column while others hold cards.
  const active =
    visibleColumns.find((column) => column.key === activeStatusKey) ??
    visibleColumns.find((column) => column.rows.length > 0) ??
    visibleColumns[0];

  return (
    <>
      {/* Mobile: stage tabs with counts, then the chosen stage's cards. */}
      <div className="md:hidden">
        <nav aria-label={strings.admissions.board.tabsLabel}>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {visibleColumns.map((column) => {
              const isActive = column.key === active?.key;
              return (
                <li key={column.key} className="shrink-0">
                  <Link
                    href={boardHref(column.key, showTerminal)}
                    aria-current={isActive ? "page" : undefined}
                    className={tabClass(isActive)}
                  >
                    {column.label}
                    <span className={countBadgeClass(isActive)}>{column.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {terminalCount > 0 ? (
          <p className="mb-3">
            <Link
              href={boardHref(showTerminal ? null : (active?.key ?? null), !showTerminal)}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {showTerminal
                ? strings.admissions.board.hideClosed
                : strings.admissions.board.showClosed(terminalCount)}
            </Link>
          </p>
        ) : null}

        {active ? (
          <section aria-labelledby={`stage-${active.key}`} className="space-y-2">
            <h2 id={`stage-${active.key}`} className="sr-only">
              {active.label}
            </h2>
            {active.followUpsDue > 0 ? (
              <p className="text-xs text-destructive">
                {strings.admissions.board.followUpsDue(active.followUpsDue)}
              </p>
            ) : null}
            {active.rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {strings.admissions.board.emptyColumn}
              </p>
            ) : (
              <ul className="space-y-2">
                {active.rows.map((card) => (
                  <li key={card.id}>
                    <Card card={card} statusLabel={active.label} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {/* Desktop: one column per stage; a terminal column starts as a heading. */}
      <div className="hidden gap-4 overflow-x-auto pb-2 md:flex">
        {columns.map((column) => {
          const isCollapsed = column.isTerminal && !showTerminal;
          return (
            <section
              key={column.key}
              aria-labelledby={`column-${column.key}`}
              className={cn("shrink-0 rounded-xl border border-border p-3", isCollapsed ? "w-48" : "w-72")}
            >
              <header className="mb-3 space-y-1">
                <h2 id={`column-${column.key}`} className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="truncate">{column.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
                    {column.count}
                  </span>
                </h2>
                {column.followUpsDue > 0 ? (
                  <p className="text-xs text-destructive">
                    {strings.admissions.board.followUpsDue(column.followUpsDue)}
                  </p>
                ) : null}
              </header>

              {isCollapsed ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={boardHref(null, true)}>{strings.admissions.board.closedToggle}</Link>
                </Button>
              ) : column.rows.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  {strings.admissions.board.emptyColumn}
                </p>
              ) : (
                <ul className="space-y-2">
                  {column.rows.map((card) => (
                    <li key={card.id}>
                      <Card card={card} statusLabel={column.label} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
