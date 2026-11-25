import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/skeleton";

/**
 * Route-level fallback for every signed-in screen that has no closer skeleton
 * (04-ui-spec § Shared components). It holds the page's shape so the content
 * does not jump when it arrives.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3 min-w-32" />
        <Skeleton className="h-4 w-2/3 max-w-64" />
      </div>
      <ListSkeleton />
    </div>
  );
}
