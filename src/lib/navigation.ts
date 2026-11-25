/**
 * Route-change feedback (04-ui-spec § Look and feel). The top progress bar
 * listens for this event, so any client-side navigation we start ourselves
 * (e.g. the children filters) gives the same feedback as a tapped link.
 */
export const NAVIGATION_START_EVENT = "bala-palana:navigation-start";

export function announceNavigationStart(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
  }
}
