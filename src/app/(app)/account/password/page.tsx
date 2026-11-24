import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { changePassword } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/session";

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{strings.auth.changePassword}</h1>
        <p className="text-sm text-muted-foreground">
          {strings.auth.signedInAs} {user.email}
        </p>
      </div>

      {changed ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
          {strings.auth.passwordChanged}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {MESSAGES[error] ?? strings.errors.unexpected}
        </p>
      ) : null}

      <form action={changePassword} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            {strings.auth.newPassword}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="password-hint"
            className="h-11 w-full rounded-lg border border-input bg-background px-3"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            {strings.auth.newPasswordHint}
          </p>
        </div>

        <Button type="submit" className="h-11 w-full">
          {strings.auth.changePassword}
        </Button>
      </form>
    </main>
  );
}
