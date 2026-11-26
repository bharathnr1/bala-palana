import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import type { AttentionReason, AttentionRow } from "@/server/attention/queries";

/** One reason per chip, in severity order (04-ui-spec § Needs attention). */
export function AttentionReasonChips({ row }: { row: AttentionRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.reasons.map((reason) => (
        <span
          key={reason}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            reason === "overdue_follow_ups"
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {reasonLabel(reason, row)}
        </span>
      ))}
    </span>
  );
}

function reasonLabel(reason: AttentionReason, row: AttentionRow): string {
  switch (reason) {
    case "overdue_follow_ups":
      return strings.attention.reasons.overdue_follow_ups(row.overdueFollowUps);
    case "open_concerns":
      return strings.attention.reasons.open_concerns(row.openConcerns);
    case "concern_subjects":
      return strings.attention.reasons.concern_subjects(row.concernSubjects);
    case "stale":
      return strings.attention.reasons.stale(row.daysSinceLastEntry);
  }
}
