import type { ReactNode } from "react";

/**
 * The standard "nothing here yet" block (04-ui-spec § Shared components).
 * Server-safe, so any page can render it without becoming a client component.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon ? <div className="text-muted-foreground [&_svg]:size-6">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
