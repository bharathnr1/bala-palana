"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CHILD_STAGES } from "@/lib/children";
import { announceNavigationStart } from "@/lib/navigation";
import { strings } from "@/lib/strings";

type Option = { id: string; key: string; label: string };

const SELECT = "h-11 rounded-lg border border-input bg-background px-2";

/**
 * Search and filters for the children list (04-ui-spec § Children). They
 * navigate through the router inside a transition, so the top progress bar and
 * the Search button react immediately; a filter change applies at once instead
 * of waiting for another tap.
 *
 * The page remounts this component with a key derived from the URL, so its
 * local state always matches what the server rendered (back/forward included).
 */
export function ChildrenFilters({
  search,
  gradeKey,
  groupKey,
  stageParam,
  grades,
  groups,
}: {
  search: string;
  gradeKey: string;
  groupKey: string;
  stageParam: string;
  grades: readonly Option[];
  groups: readonly Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(search);
  const [grade, setGrade] = useState(gradeKey);
  const [group, setGroup] = useState(groupKey);
  const [stage, setStage] = useState(stageParam);

  const hasFilter =
    query.trim() !== "" || grade !== "" || group !== "" || stage !== "student";

  function navigate(next: { q: string; grade: string; group: string; stage: string }) {
    const params = new URLSearchParams();
    const q = next.q.trim();
    if (q) params.set("q", q);
    if (next.grade) params.set("grade", next.grade);
    if (next.group) params.set("group", next.group);
    // "student" is the server's default, so it stays out of the URL.
    if (next.stage && next.stage !== "student") params.set("stage", next.stage);

    const qs = params.toString();
    const nextUrl = qs ? `/children?${qs}` : "/children";

    // Re-submitting the same filters should not leave the progress bar waiting
    // for a URL change that never comes.
    if (`${window.location.pathname}${window.location.search}` === nextUrl) return;

    announceNavigationStart();
    startTransition(() => router.push(nextUrl));
  }

  function clear() {
    setQuery("");
    setGrade("");
    setGroup("");
    setStage("student");
    navigate({ q: "", grade: "", group: "", stage: "student" });
  }

  return (
    <form
      role="search"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: query, grade, group, stage });
      }}
      className="mb-4 space-y-2"
    >
      <div className="flex gap-2">
        <label htmlFor="child-search" className="sr-only">
          {strings.children.search}
        </label>
        <input
          id="child-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={strings.children.searchPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3"
        />
        <Button type="submit" className="h-11 min-w-24" loading={isPending}>
          {isPending ? strings.children.searching : strings.children.search}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          name="grade"
          aria-label={strings.children.filterGrade}
          value={grade}
          onChange={(event) => {
            setGrade(event.target.value);
            navigate({ q: query, grade: event.target.value, group, stage });
          }}
          className={SELECT}
        >
          <option value="">
            {strings.children.filterGrade}: {strings.children.all}
          </option>
          {grades.map((option) => (
            <option key={option.id} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          name="group"
          aria-label={strings.children.filterGroup}
          value={group}
          onChange={(event) => {
            setGroup(event.target.value);
            navigate({ q: query, grade, group: event.target.value, stage });
          }}
          className={SELECT}
        >
          <option value="">
            {strings.children.filterGroup}: {strings.children.all}
          </option>
          {groups.map((option) => (
            <option key={option.id} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          name="stage"
          aria-label={strings.children.filterStage}
          value={stage}
          onChange={(event) => {
            setStage(event.target.value);
            navigate({ q: query, grade, group, stage: event.target.value });
          }}
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
          <Button type="button" variant="ghost" className="h-11" onClick={clear}>
            {strings.children.clear}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
