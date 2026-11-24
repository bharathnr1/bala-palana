import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

/** All display dates and "today" are computed in India Standard Time (D15). */
export const TIME_ZONE = "Asia/Kolkata";

const DATE_FORMAT = "d MMM yyyy";

/** The current instant, anchored to the gurukula's time zone. */
export function nowIST(): TZDate {
  return TZDate.tz(TIME_ZONE);
}

/** Today in IST as `YYYY-MM-DD`, the shape Postgres `date` columns use. */
export function todayISO(): string {
  return format(nowIST(), "yyyy-MM-dd");
}

/**
 * Midnight IST on the given `YYYY-MM-DD`.
 *
 * The zone argument is not optional: without it `TZDate` reads the calendar
 * in the machine's local zone, and a date-only value silently shifts a day
 * on any non-IST host (Vercel runs UTC).
 */
export function parseISODate(iso: string): TZDate {
  return new TZDate(`${iso}T00:00:00+05:30`, TIME_ZONE);
}

/** `2026-11-24` → `24 Nov 2026`. */
export function formatDate(iso: string): string {
  return format(parseISODate(iso), DATE_FORMAT);
}

/** A stored instant as staff read it in IST: `24 Nov 2026, 18:40`. */
export function formatDateTimeIST(value: Date): string {
  return format(new TZDate(value, TIME_ZONE), "d MMM yyyy, HH:mm");
}

/**
 * Calendar days from `fromISO` to `toISO` (positive when `toISO` is later).
 * Used for "2 days overdue" and "in 3 days".
 */
export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISODate(toISO), parseISODate(fromISO));
}

/**
 * A follow-up date as staff read it: `Today`, `Tomorrow`, `3 days overdue`,
 * `in 2 weeks`, or the plain date once it is far away.
 */
export function relativeDueLabel(dueISO: string, todayISODate: string = todayISO()): string {
  const days = daysBetween(todayISODate, dueISO);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) {
    const overdue = Math.abs(days);
    return overdue === 1 ? "1 day overdue" : `${overdue} days overdue`;
  }
  if (days <= 14) return `in ${days} days`;
  return formatDate(dueISO);
}

/** `null`/missing dates render as an em dash rather than "Invalid Date". */
export function formatDateOrDash(iso: string | null | undefined): string {
  return iso ? formatDate(iso) : "—";
}

export { parseISO };
