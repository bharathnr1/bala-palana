import { Skeleton } from "@/components/skeleton";
import { strings } from "@/lib/strings";

/** Sign-in fallback: title and the two fields. */
export default function LoginLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <span className="sr-only">{strings.states.loading}</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full" />
      </div>

      <Skeleton className="h-11 w-full" />
    </div>
  );
}
