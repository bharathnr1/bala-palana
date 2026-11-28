import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/**
 * The fallback every list-shaped route shares (04-ui-spec § Feedback and
 * loading): a title, optional filter controls and placeholder rows. Keeping it
 * here means a route's `loading.tsx` stays a one-liner and every list settles
 * into the same shape.
 */
export function ListPageSkeleton({
  rows = 5,
  filters = 0,
  description = false,
}: {
  rows?: number;
  filters?: number;
  description?: boolean;
}) {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{strings.states.loading}</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        {description ? <Skeleton className="h-4 w-2/3 max-w-80" /> : null}
      </div>

      {filters > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: filters }, (_, index) => (
            <Skeleton key={index} className="h-11 w-36" />
          ))}
        </div>
      ) : null}

      <ListSkeleton rows={rows} />
    </div>
  );
}
