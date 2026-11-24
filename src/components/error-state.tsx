import type { ReactNode } from "react";

import { strings } from "@/lib/strings";

/**
 * The standard failure block (04-ui-spec § Shared components). Pass a retry
 * control through `action`; the default copy comes from `strings.ts`.
 */
export function ErrorState({
  title = strings.states.errorTitle,
  description = strings.states.errorBody,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <p className="font-medium text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
