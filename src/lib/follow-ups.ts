import { daysBetween, todayISO } from "./dates";

export type FollowUpBucket = "overdue" | "today" | "upcoming";

/**
 * Which section a follow-up belongs in (04-ui-spec § Follow-ups). "Today" is
 * the IST calendar day, so a follow-up at 23:30 UTC on the 25th that is already
 * the 26th in India counts as today (D15).
 */
export function followUpBucket(
  dueISO: string,
  todayISODate: string = todayISO(),
): FollowUpBucket {
  const days = daysBetween(todayISODate, dueISO);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return "upcoming";
}

export type GroupedFollowUps<T> = Record<FollowUpBucket, T[]>;

export const FOLLOW_UP_BUCKETS: readonly FollowUpBucket[] = ["overdue", "today", "upcoming"];

/** Groups rows in the order the screens show them, keeping each bucket's sort. */
export function groupFollowUps<T extends { followUpOn: string }>(
  rows: readonly T[],
  todayISODate: string = todayISO(),
): GroupedFollowUps<T> {
  const grouped: GroupedFollowUps<T> = { overdue: [], today: [], upcoming: [] };
  for (const row of rows) {
    grouped[followUpBucket(row.followUpOn, todayISODate)].push(row);
  }
  return grouped;
}

/** Home shows the next seven days; anything later waits on `/follow-ups`. */
export function withinDays(dueISO: string, days: number, todayISODate: string = todayISO()): boolean {
  const difference = daysBetween(todayISODate, dueISO);
  return difference >= 0 && difference <= days;
}
