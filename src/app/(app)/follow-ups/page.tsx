import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { FollowUpList } from "@/features/follow-ups/follow-up-list";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { FOLLOW_UPS_LIMIT, listOpenFollowUps } from "@/server/follow-ups/queries";

export const metadata: Metadata = { title: strings.nav.followUps };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tabClass(isActive: boolean): string {
  return isActive
    ? "inline-flex min-h-11 items-center rounded-full border border-primary bg-primary px-3 text-sm text-primary-foreground"
    : "inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:bg-muted";
}

/**
 * Follow-ups (M2-05): Mine for everyone, All for a coordinator and above,
 * grouped Overdue / Today / Upcoming. Admission follow-ups join in M5.
 */
export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("entry.create");
  const params = await searchParams;
  const canSeeAll = can(user, "entry.edit_any");
  const showAll = canSeeAll && first(params.who) === "all";

  const list = await listOpenFollowUps(user, { mine: !showAll });

  return (
    <>
      <PageHeader title={strings.nav.followUps} />

      {canSeeAll ? (
        <nav aria-label={strings.followUps.tabsLabel} className="mb-4">
          <ul className="flex gap-2">
            <li>
              <Link
                href="/follow-ups"
                aria-current={showAll ? undefined : "page"}
                className={tabClass(!showAll)}
              >
                {strings.followUps.mine}
              </Link>
            </li>
            <li>
              <Link
                href="/follow-ups?who=all"
                aria-current={showAll ? "page" : undefined}
                className={tabClass(showAll)}
              >
                {strings.followUps.all}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}

      {list.hasMore ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {strings.followUps.showingFirst(FOLLOW_UPS_LIMIT)}
        </p>
      ) : null}

      {/* A fresh key reseeds the client list when the tab changes. */}
      <FollowUpList key={showAll ? "all" : "mine"} rows={list.rows} />
    </>
  );
}
