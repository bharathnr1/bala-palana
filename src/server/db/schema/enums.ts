import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums fixed by code (02-schema § Enums). Anything the gurukula may rename
 * or extend is a `lookup` row instead (D7).
 *
 * All eight are declared here so that later milestones only add tables and
 * never have to touch the type registry.
 */
export const userRole = pgEnum("user_role", ["admin", "management", "coordinator", "teacher"]);

export const childStage = pgEnum("child_stage", [
  "applicant",
  "student",
  "alumna",
  "not_admitted",
  "withdrawn",
]);

export const visibility = pgEnum("visibility", ["staff", "restricted"]);

export const entryStatus = pgEnum("entry_status", ["open", "closed"]);

export const admissionEventKind = pgEnum("admission_event_kind", [
  "status_change",
  "interview",
  "assessment",
  "activity",
  "observation",
  "note",
]);

export const cycleStatus = pgEnum("cycle_status", [
  "planned",
  "active",
  "paused",
  "skipped",
  "done",
]);

export const teamRole = pgEnum("team_role", ["lead", "member"]);

export const feedbackStatus = pgEnum("feedback_status", ["new", "triaged", "done"]);
