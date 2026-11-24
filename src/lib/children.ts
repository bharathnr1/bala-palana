/**
 * Child vocabulary shared by the server and the UI (02-schema § Child and
 * family). Mirrors the `child_stage` enum, and the labels live in
 * `strings.children.stage`.
 */
export const CHILD_STAGES = [
  "applicant",
  "student",
  "alumna",
  "not_admitted",
  "withdrawn",
] as const;

export type ChildStage = (typeof CHILD_STAGES)[number];

export function isChildStage(value: unknown): value is ChildStage {
  return typeof value === "string" && (CHILD_STAGES as readonly string[]).includes(value);
}

/** Initials for the avatar fallback: "Ananya Sharma" → "AS". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Consent is required before a child becomes a student (03 § Rules beyond the
 * matrix). Pure, so the rule is unit-tested and the action just throws.
 */
export function consentSatisfied(
  input: { stage: ChildStage; consent: boolean },
  alreadyRecorded: Date | null | undefined,
): boolean {
  return input.stage !== "student" || input.consent || Boolean(alreadyRecorded);
}
