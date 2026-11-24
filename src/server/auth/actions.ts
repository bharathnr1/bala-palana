"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { TEST_USER_COOKIE } from "@/lib/test-auth";
import { getDb } from "@/server/db/client";
import { appUser } from "@/server/db/schema";
import { mutate } from "@/server/db/mutate";

import { checkInvite } from "./invite";
import { requireUser } from "./session";
import { createSupabaseServerClient } from "./supabase";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const newPasswordSchema = z.object({
  password: z.string().min(8),
});

async function findByEmail(email: string) {
  const [row] = await getDb().select().from(appUser).where(eq(appUser.email, email)).limit(1);
  return row;
}

/** Email + password sign-in; an uninvited or inactive user is signed straight out (03). */
export async function signIn(formData: FormData): Promise<void> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/login?error=invalid");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user?.email) redirect("/login?error=invalid_credentials");

  const row = await findByEmail(data.user.email);
  const outcome = checkInvite(row);
  if (!outcome.ok || !row) {
    await supabase.auth.signOut();
    redirect(`/login?error=${outcome.ok ? "not_invited" : outcome.reason}`);
  }

  if (!row.authUserId) {
    await mutate(row, (tx) =>
      tx.update(appUser).set({ authUserId: data.user.id }).where(eq(appUser.id, row.id)),
    );
  }
  await mutate(row, (tx) =>
    tx.update(appUser).set({ lastSeenAt: new Date() }).where(eq(appUser.id, row.id)),
  );

  redirect("/");
}

/** Test sign-in: picks a seeded account (AUTH_MODE=test only, never on Vercel). */
export async function signInAs(formData: FormData): Promise<void> {
  if (env().AUTH_MODE !== "test") redirect("/login");

  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) redirect("/login?error=invalid");

  const [row] = await getDb().select().from(appUser).where(eq(appUser.id, userId.data)).limit(1);
  if (!row || !row.active) redirect("/login?error=not_invited");

  const store = await cookies();
  store.set(TEST_USER_COOKIE, row.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}

export async function signOut(): Promise<void> {
  if (env().AUTH_MODE === "test") {
    (await cookies()).delete(TEST_USER_COOKIE);
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** *Account → Change password* (D3). Disabled in test mode, which has no real account. */
export async function changePassword(formData: FormData): Promise<void> {
  await requireUser();

  if (env().AUTH_MODE === "test") redirect("/account/password?error=test_mode");

  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/account/password?error=invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  redirect(error ? "/account/password?error=failed" : "/account/password?changed=1");
}
