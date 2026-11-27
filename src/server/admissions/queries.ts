import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, lookup } from "@/server/db/schema";
import { vAdmissionsFunnel } from "@/server/db/schema/views";

export type LookupOption = { key: string; label: string };

export type StatusOption = LookupOption & { isTerminal: boolean };

export type AdmissionOptions = {
  statuses: StatusOption[];
  sources: LookupOption[];
  assignees: { id: string; name: string }[];
};

/**
 * The active stages, sources and assignable staff for the enquiry and detail
 * forms (D7: the client sends keys and ids, never labels).
 */
export async function admissionOptions(user: SessionUser): Promise<AdmissionOptions> {
  assertCan(user, "admission.read");

  const [rows, people] = await Promise.all([
    getDb()
      .select({ kind: lookup.kind, key: lookup.key, label: lookup.label, meta: lookup.meta })
      .from(lookup)
      .where(
        and(
          eq(lookup.active, true),
          inArray(lookup.kind, ["admission_status", "admission_source"]),
        ),
      )
      .orderBy(asc(lookup.kind), asc(lookup.sort)),
    getDb()
      .select({ id: appUser.id, name: appUser.name, role: appUser.role })
      .from(appUser)
      .where(eq(appUser.active, true))
      .orderBy(asc(appUser.name)),
  ]);

  const ofKind = (kind: string): LookupOption[] =>
    rows.filter((row) => row.kind === kind).map(({ key, label }) => ({ key, label }));

  return {
    statuses: rows
      .filter((row) => row.kind === "admission_status")
      .map(({ key, label, meta }) => ({
        key,
        label,
        isTerminal: meta.terminal === true,
      })),
    sources: ofKind("admission_source"),
    // Only a role that can act on the enquiry is worth assigning it to.
    assignees: people
      .filter((person) => can(person, "admission.write"))
      .map(({ id, name }) => ({ id, name })),
  };
}

export type FunnelRow = { status: string; count: number; followUpsDue: number };

/** One row per active stage, in stage order (M5-01, read by the board). */
export async function admissionFunnel(user: SessionUser): Promise<FunnelRow[]> {
  assertCan(user, "admission.read");

  return getDb()
    .select({
      status: vAdmissionsFunnel.status,
      count: vAdmissionsFunnel.count,
      followUpsDue: vAdmissionsFunnel.followUpsDue,
    })
    .from(vAdmissionsFunnel)
    .orderBy(asc(vAdmissionsFunnel.sort));
}
