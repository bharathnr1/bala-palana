import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { ChildStage } from "@/lib/children";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import {
  admission,
  admissionEvent,
  appUser,
  child,
  childGuardian,
  guardian,
  lookup,
} from "@/server/db/schema";
import { vAdmissionsFunnel } from "@/server/db/schema/views";

export type LookupOption = { key: string; label: string };

export type StatusOption = LookupOption & { isTerminal: boolean };

export type AdmissionOptions = {
  statuses: StatusOption[];
  sources: LookupOption[];
  relations: LookupOption[];
  assignees: { id: string; name: string }[];
};

/**
 * The active stages, sources, relations and assignable staff for the enquiry
 * and detail forms (D7: the client sends keys and ids, never labels).
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
          inArray(lookup.kind, ["admission_status", "admission_source", "relation"]),
        ),
      )
      .orderBy(asc(lookup.kind), asc(lookup.sort), asc(lookup.label)),
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
    relations: ofKind("relation"),
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

/**
 * The board reads one urgent-first page rather than every enquiry ever made.
 * The funnel still reports the true total, so a column can say how many rows
 * it is not showing (M5-02).
 */
export const ADMISSIONS_BOARD_LIMIT = 300;

export type AdmissionCard = {
  id: string;
  childId: string;
  childName: string;
  preferredName: string | null;
  statusKey: string;
  statusLabel: string;
  enquiryOn: string;
  interviewOn: string | null;
  nextAction: string | null;
  followUpOn: string | null;
  assignedToName: string | null;
};

export type AdmissionColumn = {
  key: string;
  label: string;
  isTerminal: boolean;
  /** Every row in the stage, not only the ones this page carries. */
  count: number;
  followUpsDue: number;
  rows: AdmissionCard[];
};

const statusLookup = alias(lookup, "status_lookup");

/** Admissions in every stage, urgent first, for the mobile tabs and the kanban (M5-02). */
export async function admissionBoard(
  user: SessionUser,
): Promise<{ columns: AdmissionColumn[]; hasMore: boolean }> {
  assertCan(user, "admission.read");

  const [options, funnel, rows] = await Promise.all([
    admissionOptions(user),
    admissionFunnel(user),
    getDb()
      .select({
        id: admission.id,
        childId: admission.childId,
        childName: child.fullName,
        preferredName: child.preferredName,
        statusKey: statusLookup.key,
        statusLabel: statusLookup.label,
        enquiryOn: admission.enquiryOn,
        interviewOn: admission.interviewOn,
        nextAction: admission.nextAction,
        followUpOn: admission.followUpOn,
        assignedToName: appUser.name,
      })
      .from(admission)
      .innerJoin(child, eq(child.id, admission.childId))
      .innerJoin(statusLookup, eq(statusLookup.id, admission.statusId))
      .leftJoin(appUser, eq(appUser.id, admission.assignedTo))
      .where(isNull(child.anonymisedAt))
      // Ascending order puts a null follow-up last in Postgres, which is what
      // an urgent-first board wants: dated work before "someday".
      .orderBy(asc(admission.followUpOn), desc(admission.enquiryOn))
      .limit(ADMISSIONS_BOARD_LIMIT + 1),
  ]);

  const page = rows.slice(0, ADMISSIONS_BOARD_LIMIT);
  const byStatus = new Map<string, AdmissionCard[]>();
  for (const row of page) {
    const list = byStatus.get(row.statusKey) ?? [];
    list.push(row);
    byStatus.set(row.statusKey, list);
  }

  const columns = options.statuses.map((status) => {
    const funnelRow = funnel.find((entry) => entry.status === status.label);
    return {
      key: status.key,
      label: status.label,
      isTerminal: status.isTerminal,
      count: funnelRow?.count ?? 0,
      followUpsDue: funnelRow?.followUpsDue ?? 0,
      rows: byStatus.get(status.key) ?? [],
    };
  });

  return { columns, hasMore: rows.length > ADMISSIONS_BOARD_LIMIT };
}

export type AdmissionEventRow = {
  id: string;
  kind: (typeof admissionEvent.$inferSelect)["kind"];
  occurredOn: string;
  note: string | null;
  statusLabel: string | null;
  authorName: string | null;
};

export type AdmissionGuardian = {
  name: string;
  phone: string | null;
  relationLabel: string | null;
};

export type AdmissionDetail = {
  id: string;
  childId: string;
  childName: string;
  preferredName: string | null;
  dob: string | null;
  stage: ChildStage;
  joinedOn: string | null;
  enquiryOn: string;
  interviewOn: string | null;
  nextAction: string | null;
  followUpOn: string | null;
  statusKey: string;
  statusLabel: string;
  isTerminal: boolean;
  sourceKey: string | null;
  sourceLabel: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  guardians: AdmissionGuardian[];
  events: AdmissionEventRow[];
};

/** One enquiry with its family and event history, for the card detail (M5-02). */
export async function getAdmission(
  user: SessionUser,
  id: string,
): Promise<AdmissionDetail | null> {
  assertCan(user, "admission.read");

  const sourceLookup = alias(lookup, "source_lookup");
  const relationLookup = alias(lookup, "relation_lookup");
  const eventStatus = alias(lookup, "event_status_lookup");

  const [row] = await getDb()
    .select({
      id: admission.id,
      childId: admission.childId,
      childName: child.fullName,
      preferredName: child.preferredName,
      dob: child.dob,
      stage: child.stage,
      joinedOn: child.joinedOn,
      enquiryOn: admission.enquiryOn,
      interviewOn: admission.interviewOn,
      nextAction: admission.nextAction,
      followUpOn: admission.followUpOn,
      statusKey: statusLookup.key,
      statusLabel: statusLookup.label,
      statusMeta: statusLookup.meta,
      sourceKey: sourceLookup.key,
      sourceLabel: sourceLookup.label,
      assignedToId: admission.assignedTo,
      assignedToName: appUser.name,
    })
    .from(admission)
    .innerJoin(child, eq(child.id, admission.childId))
    .innerJoin(statusLookup, eq(statusLookup.id, admission.statusId))
    .leftJoin(sourceLookup, eq(sourceLookup.id, admission.sourceId))
    .leftJoin(appUser, eq(appUser.id, admission.assignedTo))
    .where(and(eq(admission.id, id), isNull(child.anonymisedAt)))
    .limit(1);

  if (!row) return null;

  const [guardians, events] = await Promise.all([
    getDb()
      .select({
        name: guardian.name,
        phone: guardian.phone,
        relationLabel: relationLookup.label,
      })
      .from(childGuardian)
      .innerJoin(guardian, eq(guardian.id, childGuardian.guardianId))
      .leftJoin(relationLookup, eq(relationLookup.id, childGuardian.relationId))
      .where(eq(childGuardian.childId, row.childId))
      .orderBy(desc(childGuardian.isPrimary), asc(guardian.name)),
    getDb()
      .select({
        id: admissionEvent.id,
        kind: admissionEvent.kind,
        occurredOn: admissionEvent.occurredOn,
        note: admissionEvent.note,
        statusLabel: eventStatus.label,
        authorName: appUser.name,
      })
      .from(admissionEvent)
      .leftJoin(eventStatus, eq(eventStatus.id, admissionEvent.statusId))
      .leftJoin(appUser, eq(appUser.id, admissionEvent.authorId))
      .where(eq(admissionEvent.admissionId, id))
      .orderBy(desc(admissionEvent.occurredOn), desc(admissionEvent.createdAt)),
  ]);

  return {
    id: row.id,
    childId: row.childId,
    childName: row.childName,
    preferredName: row.preferredName,
    dob: row.dob,
    stage: row.stage,
    joinedOn: row.joinedOn,
    enquiryOn: row.enquiryOn,
    interviewOn: row.interviewOn,
    nextAction: row.nextAction,
    followUpOn: row.followUpOn,
    statusKey: row.statusKey,
    statusLabel: row.statusLabel,
    isTerminal: row.statusMeta.terminal === true,
    sourceKey: row.sourceKey,
    sourceLabel: row.sourceLabel,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedToName,
    guardians,
    events,
  };
}
