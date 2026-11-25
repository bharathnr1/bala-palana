import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Children list fallback: title, search, filters and a card grid. */
export default function ChildrenLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{strings.states.loading}</span>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-24" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-28" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[4.25rem] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
