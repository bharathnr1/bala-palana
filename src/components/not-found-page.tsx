import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/** The friendly dead end, inside the app shell and outside it. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{strings.states.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">{strings.states.notFoundBody}</p>
      <Button asChild className="mt-2 h-11">
        <Link href="/">{strings.states.backHome}</Link>
      </Button>
    </div>
  );
}
