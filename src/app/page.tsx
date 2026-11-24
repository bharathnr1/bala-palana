import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { signOut } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/session";

/** Placeholder Home until M0-07 builds the signed-in shell. */
export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{strings.appName}</h1>
        <p className="text-muted-foreground">{strings.appTagline}</p>
      </div>

      <p className="text-sm">
        {strings.auth.signedInAs} <strong>{user.name}</strong> · {user.role}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="h-11">
          <Link href="/account/password">{strings.auth.changePassword}</Link>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost" className="h-11">
            {strings.auth.signOut}
          </Button>
        </form>
      </div>
    </main>
  );
}
