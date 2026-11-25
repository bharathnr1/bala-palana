import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Placeholder for a form screen while its lookups load. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div role="status" aria-busy="true" className="max-w-2xl space-y-6">
      <span className="sr-only">{strings.states.loading}</span>
      <Skeleton className="h-8 w-40" />
      <div className="space-y-4 rounded-xl border border-border p-4">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-32" />
    </div>
  );
}
