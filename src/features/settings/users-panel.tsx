"use client";

import { useActionState } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import {
  addUserAction,
  changeRoleAction,
  resetPasswordAction,
  setUserActiveAction,
} from "@/server/settings/actions";

export type SettingsUserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastSeenLabel: string;
};

type UserActionResult = ActionResult<{ id: string; tempPassword: string | null }>;

const INPUT = "h-11 w-full rounded-lg border border-input bg-background px-3";

function ErrorText({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {state.error.message}
    </p>
  );
}

function UserRow({ user }: { user: SettingsUserRow }) {
  const [roleState, roleAction, rolePending] = useActionState(
    (_previous: ActionResult<string> | null, formData: FormData) => changeRoleAction(formData),
    null,
  );
  const [activeState, activeAction, activePending] = useActionState(
    (_previous: ActionResult<string> | null, formData: FormData) => setUserActiveAction(formData),
    null,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    (_previous: ActionResult<{ tempPassword: string }> | null, formData: FormData) =>
      resetPasswordAction(formData),
    null,
  );

  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <span
          className={
            user.active
              ? "rounded-full bg-secondary px-2 py-0.5 text-xs"
              : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
          }
        >
          {user.active ? strings.settings.users.active : strings.settings.users.inactive}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {strings.settings.users.lastSeen}: {user.lastSeenLabel}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <form action={roleAction} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <label htmlFor={`role-${user.id}`} className="sr-only">
            {strings.settings.users.role}
          </label>
          <select
            id={`role-${user.id}`}
            name="role"
            defaultValue={user.role}
            className="h-11 rounded-lg border border-input bg-background px-2"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {strings.settings.users.roles[role]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" className="h-11" loading={rolePending}>
            {strings.settings.users.save}
          </Button>
        </form>

        <form action={activeAction}>
          <input type="hidden" name="userId" value={user.id} />
          {user.active ? null : <input type="hidden" name="active" value="on" />}
          <Button
            type="submit"
            variant={user.active ? "destructive" : "outline"}
            className="h-11"
            loading={activePending}
          >
            {user.active ? strings.settings.users.deactivate : strings.settings.users.reactivate}
          </Button>
        </form>

        <form action={passwordAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button type="submit" variant="ghost" className="h-11" loading={passwordPending}>
            {passwordPending ? strings.settings.users.resetting : strings.settings.users.resetPassword}
          </Button>
        </form>
      </div>

      <ErrorText state={roleState} />
      <ErrorText state={activeState} />
      <ErrorText state={passwordState} />
      {passwordState?.ok ? (
        <Alert tone="success">
          {strings.settings.users.tempPasswordTitle}: <strong>{passwordState.data.tempPassword}</strong>
        </Alert>
      ) : null}
    </li>
  );
}

export function UsersPanel({ users }: { users: SettingsUserRow[] }) {
  const [state, formAction, pending] = useActionState(
    (_previous: UserActionResult | null, formData: FormData) => addUserAction(formData),
    null,
  );

  const fieldErrors = state && !state.ok ? (state.error.fieldErrors ?? {}) : {};

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">{strings.settings.users.addTitle}</h2>

        {state && !state.ok ? <Alert tone="error">{state.error.message}</Alert> : null}

        {state?.ok && state.data.tempPassword ? (
          <Alert tone="success">
            {strings.settings.users.tempPasswordTitle}:{" "}
            <strong>{state.data.tempPassword}</strong>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="new-name" className="text-sm font-medium">
              {strings.settings.users.name}
            </label>
            <input id="new-name" name="name" required maxLength={200} className={INPUT} />
            {fieldErrors.name ? (
              <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="new-email" className="text-sm font-medium">
              {strings.settings.users.email}
            </label>
            <input id="new-email" name="email" type="email" required className={INPUT} />
            {fieldErrors.email ? (
              <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="new-role" className="text-sm font-medium">
              {strings.settings.users.role}
            </label>
            <select id="new-role" name="role" defaultValue="teacher" className={INPUT}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {strings.settings.users.roles[role]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit" className="h-11" loading={pending}>
          {pending ? strings.settings.users.adding : strings.settings.users.add}
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{strings.settings.users.empty}</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </div>
  );
}
