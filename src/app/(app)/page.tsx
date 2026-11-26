import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InstallHint } from "@/components/shell/install-hint";
import { FollowUpList } from "@/features/follow-ups/follow-up-list";
import { RecentlyViewed } from "@/features/children/recently-viewed";
import { formatDate, todayISO } from "@/lib/dates";
import { withinDays } from "@/lib/follow-ups";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { attentionCount } from "@/server/attention/queries";
import { requireUser } from "@/server/auth/session";
import { listOpenFollowUps } from "@/server/follow-ups/queries";

export const metadata: Metadata = { title: strings.nav.home };

/**
 * Home (04-ui-spec § Home): my follow-ups due in the next week, the needs
 * attention count, and recently viewed children.
 */
export default async function HomePage() {
  const user = await requireUser();
  // Management reads the school but records nothing, and the follow-up list is
  // the owner's own, so the query needs `entry.create` (M2-05).
  const canFollowUp = can(user, "entry.create");
  const [attention, followUps] = await Promise.all([
    attentionCount(user),
    canFollowUp ? listOpenFollowUps(user, { mine: true }) : null,
  ]);

  // Overdue and today always show; upcoming stops at seven days on Home.
  const homeRows = (followUps?.rows ?? []).filter(
    (row) => row.followUpOn < todayISO() || withinDays(row.followUpOn, 7),
  );

  return (
    <>
      <PageHeader
        title={`${strings.home.greeting}, ${user.name}`}
        description={formatDate(todayISO())}
      />

      <div className="space-y-8">
        <InstallHint />

        {canFollowUp ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{strings.home.followUpsTitle}</h2>
            <FollowUpList rows={homeRows} emptyLabel={strings.home.followUpsEmpty} />
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{strings.home.attentionTitle}</h2>
          {attention > 0 ? (
            <Link
              href="/attention"
              className="flex min-h-11 items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted"
            >
              <span className="font-medium">{strings.home.attentionCount(attention)}</span>
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
            </Link>
          ) : (
            <EmptyState title={strings.home.attentionEmpty} />
          )}
        </section>

        <RecentlyViewed
          empty={
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {strings.home.recentEmpty}
            </p>
          }
        />
      </div>
    </>
  );
}
