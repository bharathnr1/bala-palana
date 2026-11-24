import { describe, expect, it } from "vitest";

import {
  adminRemovalBlocked,
  deactivationBlocked,
  humaniseKey,
  lookupKeyFromLabel,
} from "./settings";

describe("deactivationBlocked", () => {
  const base = {
    targetId: "user-2",
    actorId: "user-1",
    targetRole: "teacher" as const,
    targetActive: true,
    activeAdminCount: 2,
  };

  it("blocks deactivating yourself", () => {
    expect(deactivationBlocked({ ...base, targetId: "user-1" })).toBe("self");
  });

  it("blocks removing the last active admin", () => {
    expect(
      deactivationBlocked({ ...base, targetRole: "admin", activeAdminCount: 1 }),
    ).toBe("last_admin");
  });

  it("allows an admin when another active admin remains", () => {
    expect(
      deactivationBlocked({ ...base, targetRole: "admin", activeAdminCount: 2 }),
    ).toBeNull();
  });

  it("does nothing for a user who is already inactive", () => {
    expect(deactivationBlocked({ ...base, targetActive: false })).toBeNull();
  });
});

describe("adminRemovalBlocked", () => {
  it("blocks demoting the last active admin", () => {
    expect(
      adminRemovalBlocked({ currentRole: "admin", nextRole: "coordinator", activeAdminCount: 1 }),
    ).toBe(true);
  });

  it("allows a role change that keeps the admin", () => {
    expect(
      adminRemovalBlocked({ currentRole: "admin", nextRole: "admin", activeAdminCount: 1 }),
    ).toBe(false);
    expect(
      adminRemovalBlocked({ currentRole: "admin", nextRole: "teacher", activeAdminCount: 2 }),
    ).toBe(false);
  });
});

describe("lookup keys", () => {
  it("turns a label into a stable key", () => {
    expect(lookupKeyFromLabel("Class teacher")).toBe("class-teacher");
    expect(lookupKeyFromLabel("  English (2nd)  ")).toBe("english-2nd");
    expect(lookupKeyFromLabel("!!")).toBe("");
  });

  it("humanises a kind for the tab strip", () => {
    expect(humaniseKey("document_kind")).toBe("Document kind");
    expect(humaniseKey("grade")).toBe("Grade");
  });
});
