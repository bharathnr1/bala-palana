import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Duties fallback: cycle switcher, action row and team cards. */
export default function DutiesLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{strings.states.loading}</span>

      <Skeleton className="mb-6 h-8 w-32" />

      <div className="flex items-center gap-2">
        <Skeleton className="size-11 shrink-0 rounded-lg" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="size-11 shrink-0 rounded-lg" />
        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-28" />
        ))}
      </div>

      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="space-y-2 pt-2">
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, card) => (
              <Skeleton key={card} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
