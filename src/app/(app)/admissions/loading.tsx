import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Board fallback: title, stage tabs and a column of cards. */
export default function AdmissionsLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{strings.states.loading}</span>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-36" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl md:w-72" />
        ))}
      </div>
    </div>
  );
}
