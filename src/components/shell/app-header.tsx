import { CircleHelp } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { signOut } from "@/server/auth/actions";
import type { SessionUser } from "@/server/auth/session";

/** The signed-in header: who you are, the theme switch, account settings, sign out. */
export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-2 backdrop-blur md:px-8">
      <Link href="/" className="text-lg font-semibold md:hidden">
        {strings.appName}
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <span className="text-muted-foreground hidden truncate text-sm sm:block">
          {user.name} · <span className="capitalize">{user.role}</span>
        </span>
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm" className="h-11">
          <Link href="/help" aria-label={strings.help.title} title={strings.help.title}>
            <CircleHelp className="size-5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-11">
          <Link href="/account/password">{strings.auth.account}</Link>
        </Button>
        <form action={signOut}>
          <SubmitButton
            variant="ghost"
            size="sm"
            className="h-11"
            pendingChildren={strings.auth.signingOut}
          >
            {strings.auth.signOut}
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}
