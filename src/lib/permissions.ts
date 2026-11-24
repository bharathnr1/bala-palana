/**
 * The permission matrix from 03-auth-and-access as data (D25).
 *
 * Pure, so both the server (`assertCan`) and the UI (`can`) can ask the same
 * question; the server answer is the one that counts.
 */
export const ROLES = ["admin", "management", "coordinator", "teacher"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "child.read",
  "child.write",
  "child.import",
  "entry.create",
  "entry.edit_own",
  "entry.edit_any",
  "entry.delete_any",
  "entry.close_follow_up",
  "restricted.read",
  "health.write",
  "document.upload",
  "admission.read",
  "admission.write",
  "duty.read",
  "duty.write",
  "assessment.read",
  "assessment.write",
  "fee.read",
  "fee.write",
  "report.read",
  "report.attention",
  "alumni.write",
  "feedback.create",
  "feedback.triage",
  "settings.manage",
  "audit.read",
] as const;
export type Action = (typeof ACTIONS)[number];

export type PermissionTable = Record<Action, Record<Role, boolean>>;

export const PERMISSIONS: PermissionTable = {
  "child.read": { admin: true, management: true, coordinator: true, teacher: true },
  "child.write": { admin: true, management: false, coordinator: true, teacher: false },
  "child.import": { admin: true, management: false, coordinator: false, teacher: false },
  "entry.create": { admin: true, management: false, coordinator: true, teacher: true },
  "entry.edit_own": { admin: true, management: false, coordinator: true, teacher: true },
  // Includes entry.delete_any (03 § Rules beyond the matrix).
  "entry.edit_any": { admin: true, management: false, coordinator: true, teacher: false },
  "entry.delete_any": { admin: true, management: false, coordinator: true, teacher: false },
  "entry.close_follow_up": { admin: true, management: false, coordinator: true, teacher: true },
  "restricted.read": { admin: true, management: true, coordinator: true, teacher: false },
  "health.write": { admin: true, management: false, coordinator: true, teacher: false },
  // Teachers may upload non-restricted kinds only; the document action checks the kind.
  "document.upload": { admin: true, management: false, coordinator: true, teacher: true },
  "admission.read": { admin: true, management: true, coordinator: true, teacher: false },
  "admission.write": { admin: true, management: false, coordinator: true, teacher: false },
  "duty.read": { admin: true, management: true, coordinator: true, teacher: true },
  "duty.write": { admin: true, management: false, coordinator: true, teacher: false },
  "assessment.read": { admin: true, management: true, coordinator: true, teacher: true },
  "assessment.write": { admin: true, management: false, coordinator: true, teacher: true },
  "fee.read": { admin: true, management: true, coordinator: true, teacher: false },
  "fee.write": { admin: true, management: false, coordinator: false, teacher: false },
  "report.read": { admin: true, management: true, coordinator: true, teacher: false },
  "report.attention": { admin: true, management: true, coordinator: true, teacher: true },
  "alumni.write": { admin: true, management: false, coordinator: true, teacher: false },
  "feedback.create": { admin: true, management: true, coordinator: true, teacher: true },
  "feedback.triage": { admin: true, management: false, coordinator: false, teacher: false },
  "settings.manage": { admin: true, management: false, coordinator: false, teacher: false },
  "audit.read": { admin: true, management: false, coordinator: false, teacher: false },
};

/** Does this role hold this permission? */
export function can(user: { role: Role }, action: Action): boolean {
  return PERMISSIONS[action][user.role];
}
