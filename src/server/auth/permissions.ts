import "server-only";

import { can, type Action, type Role } from "@/lib/permissions";

import { AppError } from "./errors";

export type { Action, Role };
export { can };

/**
 * Throws `FORBIDDEN` unless the role holds the permission. Every query and
 * action calls this before touching data (D25).
 */
export function assertCan(user: { role: Role }, action: Action): void {
  if (!can(user, action)) {
    throw new AppError("FORBIDDEN", `Not allowed: ${action}`);
  }
}
