"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ChildAvatar } from "@/components/child-avatar";
import {
  recentChildrenServerSnapshot,
  recentChildrenSnapshot,
  subscribeRecentChildren,
} from "@/lib/recent-children";
import { strings } from "@/lib/strings";

/**
 * The "Recently viewed" row (04-ui-spec § Shared components, `ChildPicker`).
 * `useSyncExternalStore` keeps the server render empty and the client in step
 * with localStorage without an effect that sets state.
 */
export function RecentlyViewed() {
  const rows = useSyncExternalStore(
    subscribeRecentChildren,
    recentChildrenSnapshot,
    recentChildrenServerSnapshot,
  );

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="recent-children-heading" className="mb-6">
      <h2 id="recent-children-heading" className="mb-2 text-sm font-semibold">
        {strings.children.recentlyViewed}
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {rows.map((row) => (
          <li key={row.id} className="shrink-0">
            <Link
              href={`/children/${row.id}`}
              className="flex h-11 items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 hover:bg-muted"
            >
              <ChildAvatar name={row.name} className="size-8 text-xs" />
              <span className="max-w-40 truncate text-sm">{row.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
