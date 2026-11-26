import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FeedbackAudio } from "@/features/feedback/feedback-audio";
import { FeedbackTriage } from "@/features/feedback/feedback-triage";
import { formatDateTimeIST } from "@/lib/dates";
import { formatDuration, pageContextLabel, type FeedbackStatus } from "@/lib/feedback";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { listFeedback } from "@/server/feedback/queries";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = { title: strings.nav.feedback };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_CLASS: Record<FeedbackStatus, string> = {
  new: "bg-secondary text-secondary-foreground",
  triaged: "bg-primary/10 text-primary",
  done: "bg-muted text-muted-foreground",
};

/**
 * Feedback (04-ui-spec § Feedback, M1-03). An admin sees every voice note with
 * its player, transcript and triage form; everyone else sees only her own.
 */
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireScreen("feedback.create");
  const params = await searchParams;
  const page = Math.max(1, Number(first(params.page)) || 1);

  const result = await listFeedback(user, page);
  const isAdmin = can(user, "feedback.triage");

  const pageHref = (target: number) => (target > 1 ? `/feedback?page=${target}` : "/feedback");

  return (
    <>
      <PageHeader
        title={isAdmin ? strings.feedback.allTitle : strings.feedback.mineTitle}
        description={isAdmin ? strings.feedback.allDescription : strings.feedback.mineDescription}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          title={strings.feedback.list.emptyTitle}
          description={
            isAdmin ? strings.feedback.list.emptyAllBody : strings.feedback.list.emptyMineBody
          }
        />
      ) : (
        <ul className="space-y-3">
          {result.rows.map((row) => {
            const context = pageContextLabel(row.pageContext);
            const hasAudio = Boolean(row.audioPath) && !row.audioDeletedAt;

            return (
              <li key={row.id} className="border-border space-y-3 rounded-xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {strings.feedback.list.author}: {row.authorName ?? "—"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {strings.feedback.list.recordedAt}: {formatDateTimeIST(row.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}
                  >
                    {strings.feedback.list.statuses[row.status]}
                  </span>
                </div>

                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{strings.feedback.list.page}</dt>
                    <dd className="break-all">{context || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{strings.feedback.list.duration}</dt>
                    <dd>{formatDuration(row.durationS)}</dd>
                  </div>
                </dl>

                <FeedbackAudio id={row.id} available={hasAudio} />

                <div>
                  <p className="text-sm font-medium">{strings.feedback.list.transcript}</p>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {row.transcript ?? strings.feedback.list.transcriptPending}
                  </p>
                </div>

                {isAdmin ? (
                  <FeedbackTriage id={row.id} status={row.status} note={row.triageNote} />
                ) : row.triageNote ? (
                  <div className="border-border border-t pt-3">
                    <p className="text-sm font-medium">{strings.feedback.list.triage.title}</p>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {row.triageNote}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {result.page > 1 || result.hasMore ? (
        <nav
          aria-label={strings.feedback.list.pagination}
          className="mt-4 flex items-center justify-between"
        >
          {result.page > 1 ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={pageHref(result.page - 1)}>{strings.feedback.list.previous}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">
            {strings.feedback.list.pageNumber} {result.page}
          </span>
          {result.hasMore ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={pageHref(result.page + 1)}>{strings.feedback.list.next}</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
