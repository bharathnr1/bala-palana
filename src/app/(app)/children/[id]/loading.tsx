import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/skeleton";

/** Child profile fallback: avatar, name, tab strip, then the timeline rows. */
export default function ChildProfileLoading() {
  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="flex gap-2 overflow-hidden border-b border-border pb-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-20 shrink-0" />
        ))}
      </div>

      <ListSkeleton rows={4} />
    </div>
  );
}
