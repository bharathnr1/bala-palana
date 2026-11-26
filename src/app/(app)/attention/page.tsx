import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AttentionReasonChips } from "@/features/attention/reason-chips";
import { strings } from "@/lib/strings";
import {
  attentionFilterOptions,
  listNeedsAttention,
  type AttentionOption,
} from "@/server/attention/queries";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.nav.attention };

const SELECT = "h-11 w-full rounded-lg border border-input bg-background px-3";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function Options({ items, allLabel }: { items: AttentionOption[]; allLabel: string }) {
  return (
    <>
      <option value="">{allLabel}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </>
  );
}

/**
 * Needs attention (M2-06): the staff-visible `v_needs_attention` rows, worst
 * first, with grade and last-author filters. A reason chip disappears as soon
 * as the underlying concern or follow-up is closed.
 */
export default async function AttentionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("report.attention");
  const params = await searchParams;
  const gradeId = first(params.grade) || undefined;
  const authorId = first(params.author) || undefined;

  const [rows, options] = await Promise.all([
    listNeedsAttention(user, { gradeId, authorId }),
    attentionFilterOptions(user),
  ]);
  const isFiltered = Boolean(gradeId || authorId);

  return (
    <>
      <PageHeader title={strings.nav.attention} description={strings.attention.description} />

      <form
        method="get"
        action="/attention"
        className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <label htmlFor="attention-grade" className="text-sm font-medium">
            {strings.attention.filterGrade}
          </label>
          <select
            id="attention-grade"
            name="grade"
            defaultValue={gradeId ?? ""}
            className={SELECT}
          >
            <Options items={options.grades} allLabel={strings.attention.allGrades} />
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="attention-author" className="text-sm font-medium">
            {strings.attention.filterTeacher}
          </label>
          <select
            id="attention-author"
            name="author"
            defaultValue={authorId ?? ""}
            className={SELECT}
          >
            <Options items={options.authors} allLabel={strings.attention.allTeachers} />
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="h-11">
            {strings.attention.apply}
          </Button>
          {isFiltered ? (
            <Button asChild variant="outline" className="h-11">
              <Link href="/attention">{strings.attention.clear}</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={strings.attention.emptyTitle} description={strings.attention.emptyBody} />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.childId}>
              <Link
                href={`/children/${row.childId}?tab=journey`}
                className="block space-y-1.5 rounded-xl border border-border p-3 hover:bg-muted/50"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{row.childName}</span>
                  {row.gradeLabel ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{row.gradeLabel}</span>
                  ) : null}
                </span>
                <AttentionReasonChips row={row} />
                <span className="block text-xs text-muted-foreground">
                  {row.lastAuthorName
                    ? strings.attention.lastAction(row.lastAuthorName)
                    : strings.attention.lastActionNone}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
