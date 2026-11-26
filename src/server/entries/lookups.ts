import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { lookup } from "@/server/db/schema";

import { categoryFlags } from "./categories";

export type LookupOption = { id: string; key: string; label: string };

export type ObserveCategory = LookupOption & {
  restricted: boolean;
  opensFollowUp: boolean;
};

/** A tag may name the categories it belongs to; without that it fits them all. */
export type ObserveTag = LookupOption & { categories: string[] | null };

export type ObserveLookups = {
  categories: ObserveCategory[];
  tags: ObserveTag[];
  subjects: LookupOption[];
  skillAreas: LookupOption[];
  achievementLevels: LookupOption[];
  achievementResults: LookupOption[];
};

const TAG_CATEGORIES = "categories";

/**
 * The active categories, for the Journey tab's filter (M2-03). Unlike
 * `observeLookups` this needs only `child.read`, because management reads the
 * timeline but never records an entry.
 */
export async function entryCategories(user: SessionUser): Promise<ObserveCategory[]> {
  assertCan(user, "child.read");

  const rows = await getDb()
    .select({ id: lookup.id, key: lookup.key, label: lookup.label, meta: lookup.meta })
    .from(lookup)
    .where(and(eq(lookup.kind, "entry_category"), eq(lookup.active, true)))
    .orderBy(asc(lookup.sort), asc(lookup.label));

  return rows
    .map((row) => ({ id: row.id, key: row.key, label: row.label, ...categoryFlags(row.meta) }))
    .filter((row) => !row.restricted || can(user, "restricted.read"));
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const list = value.filter((item): item is string => typeof item === "string");
  return list.length > 0 ? list : null;
}

/**
 * Everything the quick observation screen offers (M2-02), in one query per
 * render rather than one per chip group. Restricted categories are omitted for
 * a role that may not write them.
 */
export async function observeLookups(user: SessionUser): Promise<ObserveLookups> {
  assertCan(user, "entry.create");

  const rows = await getDb()
    .select({
      id: lookup.id,
      kind: lookup.kind,
      key: lookup.key,
      label: lookup.label,
      meta: lookup.meta,
    })
    .from(lookup)
    .where(
      and(
        eq(lookup.active, true),
        inArray(lookup.kind, [
          "entry_category",
          "tag",
          "subject",
          "skill_area",
          "achievement_level",
          "achievement_result",
        ]),
      ),
    )
    .orderBy(asc(lookup.sort), asc(lookup.label));

  const ofKind = (kind: string) =>
    rows.filter((row) => row.kind === kind).map(({ id, key, label }) => ({ id, key, label }));

  const categories = rows
    .filter((row) => row.kind === "entry_category")
    .map((row) => ({ id: row.id, key: row.key, label: row.label, ...categoryFlags(row.meta) }))
    .filter((row) => !row.restricted || can(user, "restricted.read"));

  const tags = rows
    .filter((row) => row.kind === "tag")
    .map((row) => ({
      id: row.id,
      key: row.key,
      label: row.label,
      categories: stringList(row.meta[TAG_CATEGORIES]),
    }));

  return {
    categories,
    tags,
    subjects: ofKind("subject"),
    skillAreas: ofKind("skill_area"),
    achievementLevels: ofKind("achievement_level"),
    achievementResults: ofKind("achievement_result"),
  };
}
