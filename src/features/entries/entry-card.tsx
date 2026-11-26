import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  HeartPulse,
  MessageCircle,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { formatDate, formatDateTimeIST, relativeDueLabel } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { EntryListItem } from "@/server/entries/queries";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  observation: Eye,
  concern: AlertTriangle,
  corrective_action: CheckCircle2,
  academic: BookOpen,
  skill: Sparkles,
  achievement: Award,
  responsibility: UsersRound,
  health: HeartPulse,
  alumni_interaction: MessageCircle,
};

const TONE: Record<string, string> = {
  concern: "bg-destructive/10 text-destructive",
  corrective_action: "bg-secondary text-secondary-foreground",
};

/**
 * One timeline entry (04-ui-spec § Shared components). Presentational and
 * server-safe, so the journey list and the follow-up lists share it.
 */
export function EntryCard({ entry, href }: { entry: EntryListItem; href: string }) {
  const Icon = CATEGORY_ICONS[entry.categoryKey] ?? Eye;
  const isOpen = entry.status === "open";

  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
            TONE[entry.categoryKey],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>

        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground">{entry.categoryLabel}</span>
            {entry.subjectLabel ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {entry.subjectLabel}
              </span>
            ) : null}
            {entry.tags.map((tag) => (
              <span
                key={tag.key}
                className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
              >
                {tag.label}
              </span>
            ))}
            {entry.visibility === "restricted" ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                {strings.entries.timeline.restricted}
              </span>
            ) : null}
          </span>

          {entry.note ? <span className="line-clamp-2 block text-sm">{entry.note}</span> : null}

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {entry.authorName} · {formatDateTimeIST(entry.occurredAt)}
            </span>
            {entry.followUpOn ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  isOpen && relativeDueLabel(entry.followUpOn).includes("overdue")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted",
                )}
              >
                {isOpen ? strings.entries.timeline.open : strings.entries.timeline.closed} ·{" "}
                {strings.entries.timeline.followUp(
                  entry.status === "closed"
                    ? formatDate(entry.followUpOn)
                    : relativeDueLabel(entry.followUpOn),
                )}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
