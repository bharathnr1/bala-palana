import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InstallHint } from "@/components/shell/install-hint";
import { formatDate, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { requireUser } from "@/server/auth/session";

/**
 * Home (04-ui-spec § Home). The follow-up, attention and recent lists fill in
 * with M2-05 and M2-06; until then each shows its empty state.
 */
export default async function HomePage() {
  const user = await requireUser();

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
          <EmptyState title={strings.home.attentionEmpty} />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{strings.home.recentTitle}</h2>
          <EmptyState title={strings.home.recentEmpty} />
        </section>
      </div>
    </>
  );
}
