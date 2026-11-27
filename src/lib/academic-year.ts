import { TZDate } from "@date-fns/tz";

import { TIME_ZONE } from "@/lib/dates";

/**
 * The label of the academic year containing `date`, e.g. `2026-27`.
 *
 * An academic year starts on the 1st of `startMonth` (D15, default June) and
 * is labelled by the calendar years it spans: 1 Jun 2026 – 31 May 2027 is
 * `2026-27`.
 */
export function academicYearOf(date: string | Date, startMonth: number = 6): string {
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new RangeError(`startMonth must be 1–12, got ${startMonth}`);
  }
  // Both branches read the calendar in IST. A date-only string must never be
  // interpreted in the host's zone, or the year flips on a UTC server.
  const local =
    typeof date === "string"
      ? new TZDate(`${date}T00:00:00+05:30`, TIME_ZONE)
      : new TZDate(date, TIME_ZONE);
  const startYear =
    local.getMonth() + 1 < startMonth ? local.getFullYear() - 1 : local.getFullYear();
  const endYear = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYear}`;
}

/** The label `by` years after (or before) `label`, e.g. `shiftAcademicYear("2026-27", -1)` is `2025-26`. */
export function shiftAcademicYear(label: string, by: number): string {
  const startYear = Number(label.slice(0, 4)) + by;
  if (!Number.isInteger(startYear) || startYear < 1000) {
    throw new RangeError(`Bad academic year label: ${label}`);
  }
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** First day (`YYYY-MM-DD`) of the academic year labelled `label`. */
export function academicYearStart(label: string, startMonth: number = 6): string {
  const startYear = Number(label.slice(0, 4));
  if (!Number.isInteger(startYear)) throw new RangeError(`Bad academic year label: ${label}`);
  return `${String(startYear).padStart(4, "0")}-${String(startMonth).padStart(2, "0")}-01`;
}

/** First day (`YYYY-MM-DD`) of the next academic year. */
export function academicYearEnd(label: string, startMonth: number = 6): string {
  const startYear = Number(label.slice(0, 4)) + 1;
  const month = startMonth === 1 ? 12 : startMonth - 1;
  const endYear = startMonth === 1 ? startYear - 1 : startYear;
  return lastDayOfMonth(`${String(endYear).padStart(4, "0")}-${String(month).padStart(2, "0")}`);
}

function lastDayOfMonth(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return `${monthISO}-${String(lastDay).padStart(2, "0")}`;
}
