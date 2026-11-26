import { z } from "zod";

/** Feedback voice notes stop at three minutes (M1-02, 04-ui-spec § RecordButton). */
export const MAX_FEEDBACK_SECONDS = 180;

export const FEEDBACK_STATUSES = ["new", "triaged", "done"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/**
 * What the recorder knows about the page it was opened from, stored as JSON in
 * `feedback.page_context` so the admin sees where the note came from (M1-02).
 */
export const pageContextSchema = z.object({
  route: z.string().min(1).max(300),
  childId: z.uuid().optional(),
});
export type PageContext = z.infer<typeof pageContextSchema>;

/** The readable route for a stored page context; old plain paths still work. */
export function pageContextLabel(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = pageContextSchema.safeParse(JSON.parse(value));
    if (parsed.success) return parsed.data.route;
  } catch {
    // Not JSON: fall through to the value as stored.
  }
  return value;
}

/** Seconds as `m:ss`, for the recorder timer and the feedback list. */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

const CHILD_ROUTE =
  /^\/children\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/;

/** The child a route is about, when the recorder opens on a profile (M1-02). */
export function childIdFromPath(pathname: string): string | undefined {
  return CHILD_ROUTE.exec(pathname)?.[1];
}
