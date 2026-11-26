import { describe, expect, it } from "vitest";

import { isPdfWithinLimit, MAX_PDF_BYTES } from "./file-upload";

describe("isPdfWithinLimit", () => {
  it("accepts a PDF up to 5 MB", () => {
    expect(isPdfWithinLimit(1)).toBe(true);
    expect(isPdfWithinLimit(MAX_PDF_BYTES)).toBe(true);
  });

  it("rejects an empty or oversized PDF", () => {
    expect(isPdfWithinLimit(0)).toBe(false);
    expect(isPdfWithinLimit(MAX_PDF_BYTES + 1)).toBe(false);
    expect(isPdfWithinLimit(Number.NaN)).toBe(false);
  });
});
