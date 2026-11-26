/** Authors may soft-delete their own entry for 24 hours (03 § Rules beyond the matrix). */
export const SELF_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether an entry still falls inside its author's 24-hour delete window.
 * Kept out of components so the server and the UI ask the same question and
 * the render stays free of a bare `Date.now()`.
 */
export function withinSelfDeleteWindow(createdAt: Date, nowMs: number = Date.now()): boolean {
  return nowMs - createdAt.getTime() <= SELF_DELETE_WINDOW_MS;
}
