"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { NAVIGATION_START_EVENT } from "@/lib/navigation";

type Status = "idle" | "loading" | "done";

// A fast, prefetched route can render in well under a frame; waiting a beat
// before showing the bar keeps navigation from flashing it.
const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 300;
const SAFETY_MS = 10_000;

let status: Status = "idle";
const listeners = new Set<() => void>();

function setStatus(next: Status) {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Status {
  return status;
}

function getServerSnapshot(): Status {
  return "idle";
}

let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let safetyTimer: ReturnType<typeof setTimeout> | undefined;
let shownAt = 0;
// Server Actions do not change the URL, so they bracket the bar themselves.
// The count keeps it running while actions overlap.
let activeActions = 0;
// A navigation and an action can overlap (a reader taps a link mid-save).
// Each side records that it is still running, and the last one completes the
// bar, so neither can leave it stuck on screen.
let navPending = false;

function clearTimers() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  clearTimeout(safetyTimer);
  showTimer = hideTimer = safetyTimer = undefined;
}

/** Called on a link click, a GET form submit, or a navigation we start ourselves. */
export function startNavigation() {
  navPending = true;
  if (status === "loading") return;
  clearTimers();
  if (status === "done") setStatus("idle");

  showTimer = setTimeout(() => {
    shownAt = Date.now();
    setStatus("loading");
    // Never leave the bar running if the route failed to report completion.
    safetyTimer = setTimeout(resetAndFinish, SAFETY_MS);
  }, SHOW_DELAY_MS);
}

/** Called when the URL settles, or when a navigation never happened. */
export function finishNavigation() {
  navPending = false;
  // A Server Action still running owns the bar; its own finish completes it.
  if (activeActions > 0) return;
  clearTimers();

  if (status !== "loading") {
    if (status !== "idle") setStatus("idle");
    return;
  }

  setStatus("done");
  const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
  hideTimer = setTimeout(() => setStatus("idle"), remaining + 250);
}

/** The last-resort completion: clear both sides and stop the bar. */
function resetAndFinish() {
  activeActions = 0;
  navPending = false;
  finishNavigation();
}

/**
 * Starts the bar for a Server Action, at once: the reader has already tapped,
 * so there is no prefetch delay to wait out. Call {@link finishAction} when the
 * action (and the refresh it triggers) is done.
 */
export function startAction() {
  activeActions += 1;
  if (activeActions > 1) return;
  // A navigation already showing the bar will finish it when the URL settles.
  if (status === "loading") return;

  clearTimers();
  shownAt = Date.now();
  setStatus("loading");
  // Never leave the bar running if the action never reports completion.
  safetyTimer = setTimeout(resetAndFinish, SAFETY_MS);
}

/** Completes the bar once the last running action is done. */
export function finishAction() {
  if (activeActions > 0) activeActions -= 1;
  if (activeActions > 0 || navPending) return;
  finishNavigation();
}

/**
 * The thin progress bar at the top of the app during route changes and Server
 * Actions (04-ui-spec § Feedback and loading). A mutation's own button still
 * carries the spinner and pending label; the bar is the page-level signal.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The URL settling — path or query — means the new screen has rendered.
  useEffect(() => {
    finishNavigation();
  }, [pathname, search]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // A link to the screen we are already on changes nothing, so it must not
      // leave the bar running.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      startNavigation();
    }

    function onSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      // Server Action forms have no `action` attribute; their SubmitButton
      // carries the pending state instead.
      if (!form.getAttribute("action")) return;
      startNavigation();
    }

    function onPopState() {
      startNavigation();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener(NAVIGATION_START_EVENT, startNavigation);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener(NAVIGATION_START_EVENT, startNavigation);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  if (current === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      {current === "loading" ? (
        <div className="h-full w-2/5 animate-[nav-progress-slide_1.1s_ease-in-out_infinite] bg-primary shadow-[0_0_8px_var(--primary)]" />
      ) : (
        <div className="h-full w-full animate-[nav-progress-complete_250ms_ease-out_forwards] bg-primary" />
      )}
    </div>
  );
}
