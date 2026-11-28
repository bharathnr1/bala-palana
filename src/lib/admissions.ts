/**
 * Admission vocabulary shared by the server and the UI. Mirrors the writable
 * values of the `admission_event_kind` enum; a stage change is not offered here
 * because it always goes through `changeStatus` (M5-01).
 */
export const ADMISSION_EVENT_KINDS = [
  "interview",
  "assessment",
  "activity",
  "observation",
  "note",
] as const;

export type AdmissionEventKind = (typeof ADMISSION_EVENT_KINDS)[number];
