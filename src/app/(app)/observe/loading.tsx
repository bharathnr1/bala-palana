import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Quick observation fallback: title, child search and picker rows. */
export default function ObserveLoading() {
  return (
    <div role="status" aria-busy="true" className="max-w-2xl space-y-6">
      <span className="sr-only">{strings.states.loading}</span>

      <Skeleton className="h-8 w-48" />

      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 p-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
