import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InstallHint } from "@/components/shell/install-hint";
import { formatDate, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { attentionCount } from "@/server/attention/queries";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: strings.nav.home };

/**
 * Home (04-ui-spec § Home). The follow-up list fills in with M2-05; the
 * attention count and recently viewed are live.
 */
export default async function HomePage() {
  const user = await requireUser();
  const attention = await attentionCount(user);

  return (
    <>
      <PageHeader
        title={`${strings.home.greeting}, ${user.name}`}
        description={formatDate(todayISO())}
      />

      <div className="space-y-8">
        <InstallHint />

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{strings.home.followUpsTitle}</h2>
          <EmptyState title={strings.home.followUpsEmpty} />
        </section>

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

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{strings.home.recentTitle}</h2>
          <EmptyState title={strings.home.recentEmpty} />
        </section>
      </div>
    </>
  );
}
