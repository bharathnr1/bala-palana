"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { strings } from "@/lib/strings";

/** The shell's error boundary for every signed-in route. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      action={
        <Button type="button" className="mt-2 h-11" onClick={() => reset()}>
          {strings.states.errorRetry}
        </Button>
      }
    />
  );
}
