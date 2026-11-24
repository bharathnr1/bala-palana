"use client";

import { useEffect } from "react";

/**
 * Registers the minimal service worker that makes the app installable
 * (04-ui-spec § PWA). It caches nothing, because the app is online-only (D19).
 * Production only: a worker in `next dev` would survive builds and confuse
 * local testing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a convenience; the app works without the worker.
    });
  }, []);

  return null;
}
