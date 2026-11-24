import { describe, expect, it } from "vitest";

import { ACTIONS, PERMISSIONS, ROLES, can, type Action, type Role } from "@/lib/permissions";

/**
 * The table exactly as it appears in 03-auth-and-access § Permission matrix.
 * Teacher's `document.upload` is non-restricted kinds only; the document action
 * enforces the kind.
 */
const EXPECTED: Record<string, Record<"admin" | "management" | "coordinator" | "teacher", boolean>> =
  {
    "child.read": { admin: true, management: true, coordinator: true, teacher: true },
    "child.write": { admin: true, management: false, coordinator: true, teacher: false },
    "child.import": { admin: true, management: false, coordinator: false, teacher: false },
    "entry.create": { admin: true, management: false, coordinator: true, teacher: true },
    "entry.edit_own": { admin: true, management: false, coordinator: true, teacher: true },
    "entry.edit_any": { admin: true, management: false, coordinator: true, teacher: false },
    "entry.delete_any": { admin: true, management: false, coordinator: true, teacher: false },
    "entry.close_follow_up": { admin: true, management: false, coordinator: true, teacher: true },
    "restricted.read": { admin: true, management: true, coordinator: true, teacher: false },
    "health.write": { admin: true, management: false, coordinator: true, teacher: false },
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

describe("permission matrix", () => {
  it("has an entry for every action and role", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ACTIONS].sort());
    for (const action of ACTIONS) {
      for (const role of ROLES) {
        expect(typeof PERMISSIONS[action][role], `${action}/${role}`).toBe("boolean");
      }
    }
  });

  it("matches 03-auth-and-access for every role and action", () => {
    for (const action of ACTIONS) {
      for (const role of ROLES) {
        expect(can({ role: role as Role }, action as Action), `${action}/${role}`).toBe(
          EXPECTED[action]![role],
        );
      }
    }
  });

  it("gives no teacher administrative powers", () => {
    const adminOnly: Action[] = ["settings.manage", "audit.read", "feedback.triage", "fee.write"];
    for (const action of adminOnly) expect(can({ role: "teacher" }, action)).toBe(false);
  });
});
