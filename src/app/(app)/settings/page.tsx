import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { ListsPanel } from "@/features/settings/lists-panel";
import { PreferencesForm } from "@/features/settings/preferences-form";
import { UsersPanel, type SettingsUserRow } from "@/features/settings/users-panel";
import { formatDateTimeIST } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { getPreferences, listLookups, listUsers } from "@/server/settings/queries";

const TABS = ["users", "lists", "preferences"] as const;
type Tab = (typeof TABS)[number];

export const metadata: Metadata = { title: strings.nav.settings };

function isTab(value: string | undefined): value is Tab {
  return value !== undefined && (TABS as readonly string[]).includes(value);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Settings for the admin (04-ui-spec § Settings): users, lists and
 * preferences. The audit viewer and storage usage arrive with M8-05.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireScreen("settings.manage");
  const params = await searchParams;

  const tabParam = first(params.tab);
  const tab: Tab = isTab(tabParam) ? tabParam : "users";

  return (
    <>
      <PageHeader title={strings.nav.settings} />

      <nav aria-label={strings.nav.settings}>
        <ul className="mb-6 flex gap-1 border-b border-border">
          {TABS.map((entry) => {
            const isActive = entry === tab;
            return (
              <li key={entry} className="shrink-0">
                <Link
                  href={`/settings?tab=${entry}`}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "-mb-px block border-b-2 border-primary px-3 py-3 text-sm font-medium"
                      : "block px-3 py-3 text-sm text-muted-foreground hover:text-foreground"
                  }
                >
                  {strings.settings.tabs[entry]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "users" ? <UsersTab /> : null}
      {tab === "lists" ? <ListsTab kind={first(params.kind)} /> : null}
      {tab === "preferences" ? <PreferencesTab /> : null}
    </>
  );
}

async function UsersTab() {
  const users = await listUsers({ role: "admin" });

  const rows: SettingsUserRow[] = users.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    lastSeenLabel: row.lastSeenAt ? formatDateTimeIST(row.lastSeenAt) : strings.settings.users.never,
  }));

  return <UsersPanel users={rows} />;
}

async function ListsTab({ kind }: { kind: string | undefined }) {
  const all = await listLookups({ role: "admin" });
  const kinds = [...new Set(all.map((row) => row.kind))];
  const activeKind = kind && kinds.includes(kind) ? kind : (kinds[0] ?? "");

  return (
    <ListsPanel
      kinds={kinds}
      activeKind={activeKind}
      rows={all.filter((row) => row.kind === activeKind)}
    />
  );
}

async function PreferencesTab() {
  const values = await getPreferences({ role: "admin" });
  return <PreferencesForm values={values} />;
}
