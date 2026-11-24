import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";

import type { Role } from "@/lib/permissions";
import { DEFAULT_PREFERENCES, SETTING_KEYS, type Preferences } from "@/lib/settings";
import { assertCan } from "@/server/auth/permissions";
import { getDb } from "@/server/db/client";
import { appUser, lookup, setting } from "@/server/db/schema";

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastSeenAt: Date | null;
};

export type LookupRow = {
  id: string;
  kind: string;
  key: string;
  label: string;
  sort: number;
  active: boolean;
};

export async function listUsers(user: { role: Role }): Promise<SettingsUser[]> {
  assertCan(user, "settings.manage");

  return getDb()
    .select({
      id: appUser.id,
      name: appUser.name,
      email: appUser.email,
      role: appUser.role,
      active: appUser.active,
      lastSeenAt: appUser.lastSeenAt,
    })
    .from(appUser)
    .orderBy(asc(appUser.name));
}

/** Every lookup, grouped by kind in the order the settings screen shows them. */
export async function listLookups(user: { role: Role }): Promise<LookupRow[]> {
  assertCan(user, "settings.manage");

  return getDb()
    .select({
      id: lookup.id,
      kind: lookup.kind,
      key: lookup.key,
      label: lookup.label,
      sort: lookup.sort,
      active: lookup.active,
    })
    .from(lookup)
    .orderBy(asc(lookup.kind), asc(lookup.sort), asc(lookup.label));
}

/** The four editable settings, with the seeded defaults for anything missing. */
export async function getPreferences(user: { role: Role }): Promise<Preferences> {
  assertCan(user, "settings.manage");

  const rows = await getDb()
    .select({ key: setting.key, value: setting.value })
    .from(setting)
    .where(inArray(setting.key, Object.values(SETTING_KEYS)));

  const value = (key: string): unknown => rows.find((row) => row.key === key)?.value;
  const number = (key: string, fallback: number): number => {
    const raw = value(key);
    return typeof raw === "number" ? raw : fallback;
  };

  return {
    academicYearStartMonth: number(
      SETTING_KEYS.academicYearStartMonth,
      DEFAULT_PREFERENCES.academicYearStartMonth,
    ),
    needsAttentionDays: number(SETTING_KEYS.needsAttentionDays, DEFAULT_PREFERENCES.needsAttentionDays),
    audioRetentionDays: number(SETTING_KEYS.audioRetentionDays, DEFAULT_PREFERENCES.audioRetentionDays),
    cycleRule: "half_month",
  };
}

/** Active admins, the number the "last admin" rules need. */
export async function activeAdminCount(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(appUser)
    .where(and(eq(appUser.role, "admin"), eq(appUser.active, true)));
  return row?.value ?? 0;
}
