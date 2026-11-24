import "server-only";

import { notFound } from "next/navigation";

import { can, type Action } from "@/lib/permissions";

import { requireUser, type SessionUser } from "./session";

/**
 * Signed-in user plus the screen's permission. A role that cannot use a
 * screen gets a 404 rather than a nav item it cannot follow (03 § Rules
 * beyond the matrix: the UI mirrors the server, never the other way round).
 */
export async function requireScreen(action: Action): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, action)) notFound();
  return user;
}
