import { describe, expect, it } from "vitest";

import { addEventSchema, createEnquirySchema, setNextActionSchema } from "./mutations";

describe("admission input schemas", () => {
  it("treats blank optional fields as absent", () => {
    const parsed = createEnquirySchema.parse({
      fullName: "  TEST Applicant ",
      guardianName: "",
      enquiryOn: "",
      assignedTo: "",
    });

    expect(parsed.fullName).toBe("TEST Applicant");
    expect(parsed.guardianName).toBeUndefined();
    expect(parsed.enquiryOn).toBeUndefined();
    expect(parsed.assignedTo).toBeUndefined();
  });

  it("rejects a date that does not exist in the calendar", () => {
    const parsed = createEnquirySchema.safeParse({
      fullName: "TEST Applicant",
      dob: "2026-02-31",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a stage change disguised as an event", () => {
    const parsed = addEventSchema.safeParse({
      admissionId: "00000000-0000-4000-8000-000000000000",
      kind: "status_change",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts blank next-action fields so they can be cleared", () => {
    const parsed = setNextActionSchema.parse({
      admissionId: "00000000-0000-4000-8000-000000000000",
      nextAction: " ",
      followUpOn: "",
      assignedTo: "",
    });

    expect(parsed).toEqual({ admissionId: "00000000-0000-4000-8000-000000000000" });
  });
});
