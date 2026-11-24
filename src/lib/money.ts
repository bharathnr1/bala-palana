/**
 * Money is stored as integer paise (D27). Never use floats for arithmetic;
 * convert only at the display and input boundaries.
 */

const WHOLE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** `123456` paise → `₹1,234.56`. */
export function formatINR(paise: number | bigint): string {
  if (typeof paise === "number" && !Number.isFinite(paise)) {
    throw new RangeError(`Not a valid amount: ${paise}`);
  }
  const value = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const rupees = WHOLE.format(absolute / 100n);
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}₹${rupees}.${fraction}`;
}

/**
 * Accepts what people type — `1234`, `1234.5`, `₹1,234.56`, `1,234` — and
 * returns paise, or `null` when the text isn't a valid amount.
 */
export function parseINRToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [rupees, fraction = ""] = cleaned.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** `123456` paise → `1234.56`, for CSV exports (no symbol, no grouping). */
export function paiseToDecimalString(paise: number | bigint): string {
  const value = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${absolute / 100n}.${fraction}`;
}
