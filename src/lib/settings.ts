import type { Role } from "./permissions";

/**
 * Settings vocabulary (02-schema § Seeds, 04-ui-spec § Settings). The keys are
 * the `setting` rows the migrations seed; the UI edits their values.
 */
export const SETTING_KEYS = {
  academicYearStartMonth: "academic_year_start_month",
  cycleRule: "cycle_rule",
  needsAttentionDays: "needs_attention_days",
  audioRetentionDays: "feedback_audio_retention_days",
} as const;

export type Preferences = {
  academicYearStartMonth: number;
  needsAttentionDays: number;
  audioRetentionDays: number;
  cycleRule: "half_month";
};

export const DEFAULT_PREFERENCES: Preferences = {
  academicYearStartMonth: 6,
  needsAttentionDays: 30,
  audioRetentionDays: 90,
  cycleRule: "half_month",
};

export type DeactivationBlock = "self" | "last_admin";

/**
 * A user may not deactivate herself, and the last active admin must survive
 * (M0-09 acceptance). Pure, so the rule is unit-tested apart from the action.
 */
export function deactivationBlocked(input: {
  targetId: string;
  actorId: string;
  targetRole: Role;
  targetActive: boolean;
  activeAdminCount: number;
}): DeactivationBlock | null {
  if (!input.targetActive) return null; // already inactive; nothing to block
  if (input.targetId === input.actorId) return "self";
  if (input.targetRole === "admin" && input.activeAdminCount <= 1) return "last_admin";
  return null;
}

/** A role change away from admin is blocked when it would remove the last one. */
export function adminRemovalBlocked(input: {
  currentRole: Role;
  nextRole: Role;
  activeAdminCount: number;
}): boolean {
  return (
    input.currentRole === "admin" && input.nextRole !== "admin" && input.activeAdminCount <= 1
  );
}

/** "Class teacher" → "class-teacher"; used as the stable lookup `key` (D7). */
export function lookupKeyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** "document_kind" → "Document kind", for list tabs the admin reads. */
export function humaniseKey(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
