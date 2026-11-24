import Link from "next/link";

import { ChildAvatar } from "@/components/child-avatar";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RecentlyViewed } from "@/features/children/recently-viewed";
import { CHILD_STAGES, isChildStage, type ChildStage } from "@/lib/children";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { childLookups, listChildren } from "@/server/children/queries";

type SearchParams = Record<string, string | string[] | undefined>;

const SELECT = "h-11 rounded-lg border border-input bg-background px-2";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Children list (04-ui-spec § Children): search, filters, list on mobile, grid on desktop. */
export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireScreen("child.read");
  const params = await searchParams;

  const search = first(params.q)?.trim() ?? "";
  const gradeKey = first(params.grade) ?? "";
  const groupKey = first(params.group) ?? "";
  const stageParam = first(params.stage) ?? "student";
  const stage: ChildStage | undefined =
    stageParam === "all" ? undefined : isChildStage(stageParam) ? stageParam : "student";
  const page = Math.max(1, Number(first(params.page)) || 1);

  const [result, options] = await Promise.all([
    listChildren(user, { search, stage, gradeKey, groupKey, page }),
    childLookups(),
  ]);

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (gradeKey) query.set("grade", gradeKey);
    if (groupKey) query.set("group", groupKey);
    if (stageParam) query.set("stage", stageParam);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/children?${qs}` : "/children";
  };

  const hasFilter =
    Boolean(search) || Boolean(gradeKey) || Boolean(groupKey) || stageParam !== "student";

  return (
    <>
      <PageHeader
        title={strings.nav.children}
        actions={
          can(user, "child.write") ? (
            <Button asChild className="h-11">
              <Link href="/children/new">{strings.children.add}</Link>
            </Button>
          ) : undefined
        }
      />

      <form method="get" action="/children" className="mb-4 space-y-2">
        <div className="flex gap-2">
          <label htmlFor="child-search" className="sr-only">
            {strings.children.search}
          </label>
          <input
            id="child-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder={strings.children.searchPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3"
          />
          <Button type="submit" className="h-11">
            {strings.children.search}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            name="grade"
            aria-label={strings.children.filterGrade}
            defaultValue={gradeKey}
            className={SELECT}
          >
            <option value="">
              {strings.children.filterGrade}: {strings.children.all}
            </option>
            {options.grades.map((option) => (
              <option key={option.id} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="group"
            aria-label={strings.children.filterGroup}
            defaultValue={groupKey}
            className={SELECT}
          >
            <option value="">
              {strings.children.filterGroup}: {strings.children.all}
            </option>
            {options.groups.map((option) => (
              <option key={option.id} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="stage"
            aria-label={strings.children.filterStage}
            defaultValue={stageParam}
            className={SELECT}
          >
            <option value="all">{strings.children.all}</option>
            {CHILD_STAGES.map((option) => (
              <option key={option} value={option}>
                {strings.children.stage[option]}
              </option>
            ))}
          </select>

          {hasFilter ? (
            <Link href="/children" className="text-sm underline">
              {strings.children.clear}
            </Link>
          ) : null}
        </div>
      </form>

      <RecentlyViewed />

      {result.rows.length === 0 ? (
        <EmptyState
          title={strings.children.emptyTitle}
          description={strings.children.emptyBody}
          action={
            can(user, "child.write") && !hasFilter ? (
              <Button asChild className="mt-2 h-11">
                <Link href="/children/new">{strings.children.addFirst}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {result.rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/children/${row.id}`}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted"
              >
                <ChildAvatar name={row.fullName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.fullName}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[row.gradeLabel, row.groupLabel].filter(Boolean).join(" · ") ||
                      strings.children.stage[row.stage]}
                  </span>
                </span>
                {row.stage !== "student" ? (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {strings.children.stage[row.stage]}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.page > 1 || result.hasNext ? (
        <nav
          aria-label={strings.children.pagination}
          className="mt-4 flex items-center justify-between"
        >
          {result.page > 1 ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={pageHref(result.page - 1)}>{strings.children.previous}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            {strings.children.page} {result.page}
          </span>
          {result.hasNext ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={pageHref(result.page + 1)}>{strings.children.next}</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
