import Link from "next/link";
import { notFound } from "next/navigation";

import { ChildAvatar } from "@/components/child-avatar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { RememberView } from "@/features/children/remember-view";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { getChild } from "@/server/children/queries";

type TabKey = keyof typeof strings.children.tabs;

/** Tabs the role can't open are hidden (04-ui-spec § Child profile). */
const TABS: readonly { key: TabKey; action: Parameters<typeof can>[1] }[] = [
  { key: "journey", action: "child.read" },
  { key: "academics", action: "assessment.read" },
  { key: "skills", action: "child.read" },
  { key: "responsibilities", action: "duty.read" },
  { key: "health", action: "restricted.read" },
  { key: "family", action: "child.read" },
  { key: "documents", action: "document.upload" },
  { key: "fees", action: "fee.read" },
  { key: "admission", action: "admission.read" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Child profile shell (04-ui-spec § Child profile). The tabs fill in later. */
export default async function ChildProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("child.read");
  const { id } = await params;
  const { tab } = await searchParams;

  const profile = await getChild(user, id);
  if (!profile) notFound();

  const tabs = TABS.filter((entry) => can(user, entry.action));
  const requested = first(tab);
  const active = tabs.find((entry) => entry.key === requested) ?? tabs[0];

  const subtitle = profile.enrolment
    ? [profile.enrolment.gradeLabel, profile.enrolment.groupLabel].filter(Boolean).join(" · ")
    : "";

  return (
    <>
      <RememberView id={profile.id} name={profile.fullName} />

      <header className="mb-6 flex flex-wrap items-start gap-4 sm:flex-nowrap">
        <ChildAvatar name={profile.fullName} className="size-16 text-xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {subtitle || strings.children.stage[profile.stage]}
            {profile.preferredName ? ` · ${profile.preferredName}` : ""}
          </p>
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {strings.children.stage[profile.stage]}
          </span>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button asChild variant="outline" className="h-11">
            <Link href={`/observe?child=${profile.id}`}>{strings.children.observe}</Link>
          </Button>
          {can(user, "child.write") ? (
            <Button asChild className="h-11">
              <Link href={`/children/${profile.id}/edit`}>{strings.children.edit}</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <nav aria-label={strings.children.profile}>
        <ul className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((entry) => {
            const isActive = entry.key === active?.key;
            return (
              <li key={entry.key} className="shrink-0">
                <Link
                  href={`/children/${profile.id}?tab=${entry.key}`}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "-mb-px block border-b-2 border-primary px-3 py-3 text-sm font-medium text-foreground"
                      : "block px-3 py-3 text-sm text-muted-foreground hover:text-foreground"
                  }
                >
                  {strings.children.tabs[entry.key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="pt-4">
        {active ? <EmptyState title={strings.children.tabEmpty[active.key]} /> : null}
      </section>
    </>
  );
}
