import { describe, expect, it } from "vitest";

import { fitWithin } from "./images";

describe("fitWithin", () => {
  it("keeps a landscape photo's aspect ratio when scaling to 1600 px", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales a portrait photo by its long edge", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it("leaves an image shorter than the long edge unchanged", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });

  it("never returns a zero dimension for a broken image", () => {
    expect(fitWithin(0, 1200)).toEqual({ width: 1, height: 1 });
    expect(fitWithin(Number.NaN, 1200)).toEqual({ width: 1, height: 1 });
  });
});
