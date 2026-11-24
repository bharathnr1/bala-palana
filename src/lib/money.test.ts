import { describe, expect, it } from "vitest";

import { formatINR, paiseToDecimalString, parseINRToPaise } from "@/lib/money";

describe("money", () => {
  it("formats paise as rupees", () => {
    expect(formatINR(123456)).toBe("₹1,234.56");
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(5)).toBe("₹0.05");
    expect(formatINR(123456789)).toBe("₹12,34,567.89");
    expect(formatINR(-25000)).toBe("-₹250.00");
    expect(formatINR(9007199254740991n)).toBe("₹9,00,71,99,25,47,409.91");
  });

  it("parses what people type", () => {
    expect(parseINRToPaise("1234")).toBe(123400);
    expect(parseINRToPaise("1,234.5")).toBe(123450);
    expect(parseINRToPaise("₹1,234.56")).toBe(123456);
    expect(parseINRToPaise("0.05")).toBe(5);
    expect(parseINRToPaise("1234.567")).toBeNull();
    expect(parseINRToPaise("-5")).toBeNull();
    expect(parseINRToPaise("abc")).toBeNull();
  });

  it("exports a plain decimal", () => {
    expect(paiseToDecimalString(123456)).toBe("1234.56");
    expect(paiseToDecimalString(5)).toBe("0.05");
  });
});
