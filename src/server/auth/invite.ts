import "server-only";

/**
 * The invite allowlist (03-auth-and-access § Sign-in): only an invited, active
 * `app_user` gets a session. Pure, so both the sign-in action and `requireUser`
 * apply the same rule.
 */
export type InviteOutcome = { ok: true } | { ok: false; reason: "not_invited" | "inactive" };

export function checkInvite(user: { active: boolean } | null | undefined): InviteOutcome {
  if (!user) return { ok: false, reason: "not_invited" };
  if (!user.active) return { ok: false, reason: "inactive" };
  return { ok: true };
}
