import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChildAvatar } from "@/components/child-avatar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { EntrySheet } from "@/features/entries/entry-sheet";
import { JourneyTimeline } from "@/features/entries/journey-timeline";
import { RememberView } from "@/features/children/remember-view";
import { can } from "@/lib/permissions";
import { withinSelfDeleteWindow } from "@/lib/entry-rules";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { getChild } from "@/server/children/queries";
import { entryCategories } from "@/server/entries/lookups";
import { getEntryWithThread } from "@/server/entries/queries";
import { listChildTimeline } from "@/server/entries/timeline";
import { preferences } from "@/server/settings/queries";

type TabKey = keyof typeof strings.children.tabs;

export const metadata: Metadata = { title: strings.children.profile };

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

/** The journey filter chips share the ChipGroup look without being buttons. */
function chipClass(isActive: boolean): string {
  return isActive
    ? "inline-flex min-h-11 items-center rounded-full border border-primary bg-primary px-3 text-sm text-primary-foreground"
    : "inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:bg-muted";
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
  const { tab, category, entry: entryParam } = await searchParams;

  const profile = await getChild(user, id);
  if (!profile) notFound();

  const tabs = TABS.filter((entry) => can(user, entry.action));
  const requested = first(tab);
  const active = tabs.find((entry) => entry.key === requested) ?? tabs[0];

  // `?entry=<id>` opens the sheet over whichever tab is showing (M2-04).
  const entryId = first(entryParam);
  const thread = entryId ? await getEntryWithThread(user, entryId).catch(() => null) : null;
  if (thread && thread.entry.childId !== profile.id) notFound();

  const isJourney = active?.key === "journey";
  // Resolve the chip before the query: a category the reader cannot see falls
  // back to "All" in the list as well, so the chip and the rows never disagree.
  const categories = isJourney ? await entryCategories(user) : [];
  const activeCategory = categories.find((row) => row.key === first(category));

  const journeyData = isJourney
    ? await Promise.all([
        preferences(),
        listChildTimeline(user, id, { categoryKey: activeCategory?.key }),
      ])
    : null;
  const settings = journeyData?.[0] ?? null;
  const timeline = journeyData?.[1] ?? null;

  const backHref = `/children/${profile.id}?tab=journey${
    activeCategory ? `&category=${activeCategory.key}` : ""
  }`;
  const isAuthor = thread?.entry.authorId === user.id;
  const canEditEntry = thread
    ? can(user, "entry.edit_any") || (can(user, "entry.edit_own") && isAuthor)
    : false;
  const canDeleteEntry = thread
    ? can(user, "entry.delete_any") ||
      (can(user, "entry.edit_own") &&
        isAuthor &&
        withinSelfDeleteWindow(thread.entry.createdAt))
    : false;

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
        {isJourney && settings && timeline ? (
          <div className="space-y-4">
            <nav aria-label={strings.entries.timeline.filterLabel}>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                <li className="shrink-0">
                  <Link
                    href={`/children/${profile.id}?tab=journey`}
                    aria-current={activeCategory ? undefined : "page"}
                    className={chipClass(!activeCategory)}
                  >
                    {strings.entries.timeline.all}
                  </Link>
                </li>
                {categories.map((row) => {
                  const isActive = activeCategory?.key === row.key;
                  return (
                    <li key={row.id} className="shrink-0">
                      <Link
                        href={`/children/${profile.id}?tab=journey&category=${row.key}`}
                        aria-current={isActive ? "page" : undefined}
                        className={chipClass(isActive)}
                      >
                        {row.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {timeline.events.length === 0 ? (
              <EmptyState
                title={
                  activeCategory
                    ? strings.entries.timeline.emptyFiltered
                    : strings.entries.timeline.empty
                }
              />
            ) : (
              <JourneyTimeline
                // A filter change is a new list; the key reseeds its state.
                key={activeCategory?.key ?? "all"}
                childId={profile.id}
                events={timeline.events}
                hasMore={timeline.hasMore}
                categoryKey={activeCategory?.key}
                startMonth={settings.academicYearStartMonth}
              />
            )}
          </div>
        ) : active ? (
          <EmptyState title={strings.children.tabEmpty[active.key]} />
        ) : null}
      </section>

      {thread ? (
        <EntrySheet
          thread={thread}
          backHref={backHref}
          canEdit={canEditEntry}
          canDelete={canDeleteEntry}
          canClose={can(user, "entry.close_follow_up")}
          canCreate={can(user, "entry.create")}
        />
      ) : null}
    </>
  );
}
