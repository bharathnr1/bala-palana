import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/skeleton";

/** Settings fallback: title, tab strip and the active panel. */
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />

      <div className="flex gap-2 border-b border-border pb-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-24" />
        ))}
      </div>

      <ListSkeleton rows={4} />
    </div>
  );
}
