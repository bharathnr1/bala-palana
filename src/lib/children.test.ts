import { describe, expect, it } from "vitest";

import { CHILD_STAGES, consentSatisfied, initialsOf, isChildStage } from "./children";

describe("child stage", () => {
  it("accepts exactly the enum values", () => {
    for (const stage of CHILD_STAGES) expect(isChildStage(stage)).toBe(true);
    expect(isChildStage("graduated")).toBe(false);
    expect(isChildStage(undefined)).toBe(false);
  });
});

describe("consentSatisfied", () => {
  it("requires consent for a student", () => {
    expect(consentSatisfied({ stage: "student", consent: false }, null)).toBe(false);
    expect(consentSatisfied({ stage: "student", consent: true }, null)).toBe(true);
  });

  it("accepts consent recorded earlier", () => {
    expect(consentSatisfied({ stage: "student", consent: false }, new Date())).toBe(true);
  });

  it("does not ask for consent for other stages", () => {
    for (const stage of CHILD_STAGES.filter((value) => value !== "student")) {
      expect(consentSatisfied({ stage, consent: false }, null)).toBe(true);
    }
  });
});

describe("initialsOf", () => {
  it("uses the first and last names", () => {
    expect(initialsOf("Ananya Sharma")).toBe("AS");
    expect(initialsOf("Ananya")).toBe("A");
    expect(initialsOf("  Ananya   Devi Sharma ")).toBe("AS");
  });
});
