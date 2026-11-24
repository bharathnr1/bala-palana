"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROLES } from "@/lib/permissions";
import {
  adminRemovalBlocked,
  deactivationBlocked,
  lookupKeyFromLabel,
  SETTING_KEYS,
  type Preferences,
} from "@/lib/settings";
import { strings } from "@/lib/strings";
import { action, type ActionResult } from "@/server/auth/action";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import { mutate } from "@/server/db/mutate";
import { getDb } from "@/server/db/client";
import { appUser, lookup, setting } from "@/server/db/schema";

import { activeAdminCount } from "./queries";
import { createSupabaseAdminClient, temporaryPassword } from "./supabase-admin";

const roleSchema = z.enum(ROLES);
const uuid = z.uuid();

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

// ---------------------------------------------------------------- users ----

const addUserInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  role: roleSchema,
});

/**
 * Creates the `app_user` row and, outside test mode, the Supabase account with
 * a temporary password. A test-mode install has no Auth project, so it returns
 * the app_user row alone (the "test sign-in" list then shows it).
 */
const addUser = action(addUserInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const tempPassword = temporaryPassword();
  const admin = createSupabaseAdminClient();

  let authUserId: string | null = null;
  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error) throw new AppError("CONFLICT", error.message);
    authUserId = data.user?.id ?? null;
  }

  try {
    const id = await mutate(user, async (tx) => {
      const [created] = await tx
        .insert(appUser)
        .values({ name: input.name, email: input.email, role: input.role, authUserId })
        .returning({ id: appUser.id });
      if (!created) throw new AppError("INVALID", strings.errors.unexpected);
      return created.id;
    });
    revalidatePath("/settings");
    return { id, tempPassword: admin ? tempPassword : null };
  } catch (error) {
    // Do not leave an Auth account behind when the allowlist row fails.
    if (admin && authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    }
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", strings.settings.errors.emailTaken);
    throw error;
  }
});

const changeRoleInput = z.object({ userId: uuid, role: roleSchema });

const changeRole = action(changeRoleInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const admins = await activeAdminCount();
  const target = await mustFindUserOutside(input.userId);
  if (adminRemovalBlocked({ currentRole: target.role, nextRole: input.role, activeAdminCount: admins })) {
    throw new AppError("INVALID", strings.settings.errors.lastAdmin);
  }

  await mutate(user, async (tx) => {
    await tx.update(appUser).set({ role: input.role }).where(eq(appUser.id, input.userId));
  });
  revalidatePath("/settings");
  return input.userId;
});

const setActiveInput = z.object({ userId: uuid, active: z.preprocess((v) => v === "on" || v === true, z.boolean()) });

const setActive = action(setActiveInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const target = await mustFindUserOutside(input.userId);
  const admins = await activeAdminCount();
  if (!input.active) {
    const blocked = deactivationBlocked({
      targetId: input.userId,
      actorId: user.id,
      targetRole: target.role,
      targetActive: target.active,
      activeAdminCount: admins,
    });
    if (blocked === "self") throw new AppError("INVALID", strings.settings.errors.selfDeactivate);
    if (blocked === "last_admin") throw new AppError("INVALID", strings.settings.errors.lastAdmin);
  }

  await mutate(user, async (tx) => {
    await tx.update(appUser).set({ active: input.active }).where(eq(appUser.id, input.userId));
  });

  const admin = createSupabaseAdminClient();
  if (admin && target.authUserId) {
    // Supabase bans the long-lived account too, matching the allowlist (03 § Sign-in).
    const seconds = input.active ? "none" : "876000h";
    await admin.auth.admin.updateUserById(target.authUserId, { ban_duration: seconds }).catch(() => undefined);
  }

  revalidatePath("/settings");
  return input.userId;
});

const resetPasswordInput = z.object({ userId: uuid });

const resetPassword = action(resetPasswordInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const target = await mustFindUserOutside(input.userId);
  const admin = createSupabaseAdminClient();
  if (!admin) throw new AppError("INVALID", strings.settings.errors.authUnavailable);
  if (!target.authUserId) throw new AppError("INVALID", strings.settings.errors.neverSignedIn);

  const tempPassword = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(target.authUserId, {
    password: tempPassword,
  });
  if (error) throw new AppError("INVALID", error.message);

  return { tempPassword };
});

/** Read outside a transaction: the guards only need the current row. */
async function mustFindUserOutside(id: string) {
  const [row] = await getDb()
    .select({
      id: appUser.id,
      role: appUser.role,
      active: appUser.active,
      authUserId: appUser.authUserId,
    })
    .from(appUser)
    .where(eq(appUser.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.settings.errors.userMissing);
  return row;
}

// --------------------------------------------------------------- lists ----

const addLookupInput = z.object({
  kind: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
});

const addLookup = action(addLookupInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const key = lookupKeyFromLabel(input.label);
  if (!key) throw new AppError("INVALID", strings.settings.errors.labelNeeded);

  try {
    const id = await mutate(user, async (tx) => {
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${lookup.sort}), 0) + 1` })
        .from(lookup)
        .where(eq(lookup.kind, input.kind));
      const [created] = await tx
        .insert(lookup)
        .values({ kind: input.kind, key, label: input.label, sort: Number(next) })
        .returning({ id: lookup.id });
      if (!created) throw new AppError("INVALID", strings.errors.unexpected);
      return created.id;
    });
    revalidatePath("/settings");
    return id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", strings.settings.errors.duplicate);
    throw error;
  }
});

const renameLookupInput = z.object({ id: uuid, label: z.string().trim().min(1).max(120) });

const renameLookup = action(renameLookupInput, async (input, user) => {
  assertCan(user, "settings.manage");
  await mutate(user, async (tx) => {
    await tx.update(lookup).set({ label: input.label }).where(eq(lookup.id, input.id));
  });
  revalidatePath("/settings");
  return input.id;
});

const setLookupActiveInput = z.object({
  id: uuid,
  active: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

const setLookupActive = action(setLookupActiveInput, async (input, user) => {
  assertCan(user, "settings.manage");
  await mutate(user, async (tx) => {
    await tx.update(lookup).set({ active: input.active }).where(eq(lookup.id, input.id));
  });
  revalidatePath("/settings");
  return input.id;
});

const moveLookupInput = z.object({ id: uuid, direction: z.enum(["up", "down"]) });

const moveLookup = action(moveLookupInput, async (input, user) => {
  assertCan(user, "settings.manage");

  await mutate(user, async (tx) => {
    const [target] = await tx
      .select({ id: lookup.id, kind: lookup.kind, sort: lookup.sort })
      .from(lookup)
      .where(eq(lookup.id, input.id))
      .limit(1);
    if (!target) throw new AppError("NOT_FOUND", strings.settings.errors.lookupMissing);

    const ordered = await tx
      .select({ id: lookup.id })
      .from(lookup)
      .where(eq(lookup.kind, target.kind))
      .orderBy(asc(lookup.sort), asc(lookup.label));

    const index = ordered.findIndex((row) => row.id === target.id);
    const neighbour = ordered[input.direction === "up" ? index - 1 : index + 1];
    if (!neighbour) return;

    // Normalise the whole kind so swaps stay stable however many gaps exist.
    const ids = ordered.map((row) => row.id);
    const swapWith = ids.indexOf(neighbour.id);
    const mine = ids[index];
    const theirs = ids[swapWith];
    if (mine === undefined || theirs === undefined) return;
    ids[index] = theirs;
    ids[swapWith] = mine;
    for (const [position, id] of ids.entries()) {
      await tx.update(lookup).set({ sort: position + 1 }).where(eq(lookup.id, id));
    }
  });

  revalidatePath("/settings");
  return input.id;
});

// --------------------------------------------------------- preferences ----

const preferencesInput = z.object({
  academicYearStartMonth: z.coerce.number().int().min(1).max(12),
  needsAttentionDays: z.coerce.number().int().min(1).max(365),
  audioRetentionDays: z.coerce.number().int().min(1).max(3650),
  cycleRule: z.enum(["half_month"]),
});

const savePreferences = action(preferencesInput, async (input, user) => {
  assertCan(user, "settings.manage");

  const values: Preferences = input;
  await mutate(user, async (tx) => {
    const rows = [
      { key: SETTING_KEYS.academicYearStartMonth, value: values.academicYearStartMonth },
      { key: SETTING_KEYS.cycleRule, value: { type: values.cycleRule } },
      { key: SETTING_KEYS.needsAttentionDays, value: values.needsAttentionDays },
      { key: SETTING_KEYS.audioRetentionDays, value: values.audioRetentionDays },
    ];
    for (const row of rows) {
      await tx
        .insert(setting)
        .values({ key: row.key, value: row.value, updatedBy: user.id })
        .onConflictDoUpdate({
          target: setting.key,
          set: { value: row.value, updatedBy: user.id },
        });
    }
  });

  revalidatePath("/settings");
  return values;
});

// ---------------------------------------------------------- entry points ----

export async function addUserAction(formData: FormData): Promise<ActionResult<{ id: string; tempPassword: string | null }>> {
  return addUser(formData);
}

export async function changeRoleAction(formData: FormData): Promise<ActionResult<string>> {
  return changeRole(formData);
}

export async function setUserActiveAction(formData: FormData): Promise<ActionResult<string>> {
  return setActive(formData);
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult<{ tempPassword: string }>> {
  return resetPassword(formData);
}

export async function addLookupAction(formData: FormData): Promise<ActionResult<string>> {
  return addLookup(formData);
}

export async function renameLookupAction(formData: FormData): Promise<ActionResult<string>> {
  return renameLookup(formData);
}

export async function setLookupActiveAction(formData: FormData): Promise<ActionResult<string>> {
  return setLookupActive(formData);
}

export async function moveLookupAction(formData: FormData): Promise<ActionResult<string>> {
  return moveLookup(formData);
}

export async function savePreferencesAction(formData: FormData): Promise<ActionResult<Preferences>> {
  return savePreferences(formData);
}

/**
 * Form-only entry points for plain `<form action={…}>` controls, which expect
 * a `void` result. Errors are the same as the typed versions above; the page
 * revalidates and shows the new state.
 */
export async function addLookupForm(formData: FormData): Promise<void> {
  await addLookup(formData);
}

export async function renameLookupForm(formData: FormData): Promise<void> {
  await renameLookup(formData);
}

export async function moveLookupForm(formData: FormData): Promise<void> {
  await moveLookup(formData);
}

export async function setLookupActiveForm(formData: FormData): Promise<void> {
  await setLookupActive(formData);
}
