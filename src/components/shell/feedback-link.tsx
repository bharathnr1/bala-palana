import { Mic } from "lucide-react";
import Link from "next/link";

import { strings } from "@/lib/strings";

/**
 * The floating feedback mic that sits above the bottom bar on every page
 * (04-ui-spec § Navigation). M1-02 replaces the link with the recorder.
 */
export function FeedbackLink() {
  return (
    <Link
      href="/feedback"
      aria-label={strings.nav.feedback}
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 md:right-6 md:bottom-6"
    >
      <Mic className="size-5" aria-hidden />
    </Link>
  );
}
