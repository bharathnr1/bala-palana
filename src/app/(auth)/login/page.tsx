import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { Alert } from "@/components/alert";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { env } from "@/lib/env";
import { strings } from "@/lib/strings";
import { signIn, signInAs } from "@/server/auth/actions";
import { getDb } from "@/server/db/client";
import { appUser } from "@/server/db/schema";

const ERROR_MESSAGES: Record<string, string> = {
  not_invited: strings.auth.notInvited,
  inactive: strings.auth.inactive,
  invalid_credentials: strings.auth.invalidCredentials,
  invalid: strings.errors.invalidForm,
};

export const metadata: Metadata = { title: strings.auth.title };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const testMode = env().AUTH_MODE === "test";

  const testUsers = testMode
    ? await getDb()
        .select({ id: appUser.id, name: appUser.name, role: appUser.role })
        .from(appUser)
        .where(eq(appUser.active, true))
        .orderBy(asc(appUser.name))
    : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{strings.appName}</h1>
        <p className="text-muted-foreground">{strings.auth.title}</p>
      </div>

      {error ? (
        <Alert tone="error">{ERROR_MESSAGES[error] ?? strings.errors.unexpected}</Alert>
      ) : null}

      <form action={signIn} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            {strings.auth.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            {strings.auth.password}
          </label>
          <PasswordInput id="password" name="password" autoComplete="current-password" />
        </div>

        <SubmitButton className="h-11 w-full" pendingChildren={strings.auth.signingIn}>
          {strings.auth.submit}
        </SubmitButton>
      </form>

      {testMode ? (
        <section className="space-y-2 border-t border-border pt-4">
          <h2 className="text-sm font-semibold">{strings.auth.testModeTitle}</h2>
          <p className="text-sm text-muted-foreground">{strings.auth.testModeHint}</p>
          <ul className="space-y-2">
            {testUsers.map((user) => (
              <li key={user.id}>
                <form action={signInAs}>
                  <input type="hidden" name="userId" value={user.id} />
                  <SubmitButton
                    variant="outline"
                    className="h-11 w-full justify-start"
                    pendingChildren={`${user.name} · ${strings.auth.signingIn}`}
                  >
                    {user.name} · {user.role}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
