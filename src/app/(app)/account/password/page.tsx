import type { Metadata } from "next";

import { Alert } from "@/components/alert";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { strings } from "@/lib/strings";
import { changePassword } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: strings.auth.changePassword };

const MESSAGES: Record<string, string> = {
  test_mode: strings.auth.passwordChangeTestMode,
  failed: strings.auth.passwordChangeFailed,
  invalid: strings.errors.invalidForm,
};

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; changed?: string }>;
}) {
  const user = await requireUser();
  const { error, changed } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{strings.auth.changePassword}</h1>
        <p className="text-sm text-muted-foreground">
          {strings.auth.signedInAs} {user.email}
        </p>
      </div>

      {changed ? <Alert tone="success">{strings.auth.passwordChanged}</Alert> : null}

      {error ? <Alert tone="error">{MESSAGES[error] ?? strings.errors.unexpected}</Alert> : null}

      <form action={changePassword} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            {strings.auth.newPassword}
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            describedBy="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            {strings.auth.newPasswordHint}
          </p>
        </div>

        <SubmitButton className="h-11 w-full" pendingChildren={strings.auth.changingPassword}>
          {strings.auth.changePassword}
        </SubmitButton>
      </form>
    </div>
  );
}
