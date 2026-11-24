import { describe, expect, it } from "vitest";

import { checkInvite } from "@/server/auth/invite";

describe("checkInvite", () => {
  it("rejects an email that is not on the allowlist", () => {
    expect(checkInvite(undefined)).toEqual({ ok: false, reason: "not_invited" });
    expect(checkInvite(null)).toEqual({ ok: false, reason: "not_invited" });
  });

  it("rejects a deactivated user", () => {
    expect(checkInvite({ active: false })).toEqual({ ok: false, reason: "inactive" });
  });

  it("admits an invited, active user", () => {
    expect(checkInvite({ active: true })).toEqual({ ok: true });
  });
});
