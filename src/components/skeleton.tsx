import { cn } from "@/lib/utils";

/**
 * A pulsing placeholder block used by the route skeletons. Decorative; the
 * surrounding `role="status"` wrapper announces that the page is loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
