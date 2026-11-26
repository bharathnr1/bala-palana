import { todayISO } from "./dates";

/**
 * Cycle rules the app knows (D8). `half_month` is the practice the gurukula
 * follows today; further rules (an "every N days" one) slot in beside it
 * without touching the callers.
 */
export const CYCLE_RULES = ["half_month"] as const;
export type CycleRule = (typeof CYCLE_RULES)[number];

/** Cycle dates only; the database adds the id, status and note. */
export type CyclePeriod = { startOn: string; endOn: string };

/** The board keeps this month and the next two filled (M3-03). */
export const MONTHS_AHEAD = 2;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `2027-02-14` → `[2027, 2, 14]`, without going through a time zone. */
function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split("-").map(Number);
  return [year ?? 0, month ?? 0, day ?? 0];
}

function dayISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The last day of a month, leap years included (`Date.UTC` settles it). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True when the two closed date ranges share at least one day. */
export function periodsOverlap(a: CyclePeriod, b: CyclePeriod): boolean {
  return a.startOn <= b.endOn && b.startOn <= a.endOn;
}

/**
 * The cycles the rule produces over `[fromISO, toISO]`, in order. Periods are
 * whole — a range starting mid-cycle still yields that cycle's full dates —
 * and every period is returned once, because the caller matches them against
 * the cycles that already exist.
 */
export function cyclePeriods(rule: CycleRule, fromISO: string, toISO: string): CyclePeriod[] {
  if (rule !== "half_month") return [];

  const [firstYear, firstMonth] = parts(fromISO);
  const [lastYear, lastMonth] = parts(toISO);
  const target: CyclePeriod = { startOn: fromISO, endOn: toISO };

  const periods: CyclePeriod[] = [];
  let year = firstYear;
  let month = firstMonth;

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const last = daysInMonth(year, month);
    periods.push({ startOn: dayISO(year, month, 1), endOn: dayISO(year, month, 15) });
    if (last > 15) periods.push({ startOn: dayISO(year, month, 16), endOn: dayISO(year, month, last) });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return periods.filter((period) => periodsOverlap(period, target));
}

/**
 * The window the duty board fills on load: this month through the end of the
 * month `MONTHS_AHEAD` months from now, so there is no scheduled job (M3-01).
 */
export function ensureWindow(todayIso: string = todayISO()): CyclePeriod {
  const [year, month] = parts(todayIso);
  const endMonthIndex = month - 1 + MONTHS_AHEAD;
  const endYear = year + Math.floor(endMonthIndex / 12);
  const endMonth = (endMonthIndex % 12) + 1;

  return {
    startOn: dayISO(year, month, 1),
    endOn: dayISO(endYear, endMonth, daysInMonth(endYear, endMonth)),
  };
}

/** Why an edited cycle's dates cannot be saved; `null` when they can. */
export function cycleDatesProblem(startOn: string, endOn: string): "order" | null {
  return endOn < startOn ? "order" : null;
}

/**
 * Whether `on` is a legal split point for `period`: inside the cycle and not
 * on its first day, so both halves keep at least one day.
 */
export function canSplitAt(period: CyclePeriod, on: string): boolean {
  return on > period.startOn && on <= period.endOn;
}
