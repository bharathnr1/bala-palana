"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { finishAction, startAction } from "@/components/navigation-progress";
import type { ActionResult } from "@/server/auth/action";

type RunOptions<T> = {
  /** Runs after a successful write, before the refresh starts. */
  onSuccess?: (data: T) => void;
  /** A one-line confirmation shown with the `Alert` style. */
  successMessage?: (data: T) => string;
};

/**
 * Runs one Server Action with the feedback every mutation needs (04-ui-spec
 * § Feedback and loading): the page progress bar, a pending key so only the
 * tapped control spins, the server's error, and a refresh that keeps `busy`
 * true until the new data has rendered.
 */
export function useActionRun() {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [refreshing, startRefreshing] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = saving || refreshing;

  useEffect(() => {
    if (!busy) return;
    startAction();
    return () => finishAction();
  }, [busy]);

  function run<T>(
    key: string,
    call: () => Promise<ActionResult<T>>,
    options: RunOptions<T> = {},
  ): void {
    if (busy) return;
    setError(null);
    setSuccess(null);
    setPendingKey(key);

    startSaving(async () => {
      const result = await call();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      options.onSuccess?.(result.data);
      if (options.successMessage) setSuccess(options.successMessage(result.data));

      // The refresh is its own transition, so `busy` lasts until the refreshed
      // screen has rendered rather than only until the write returns.
      startRefreshing(() => router.refresh());
    });
  }

  // The key is only meaningful while the action (and its refresh) is running.
  return { run, busy, pendingKey: busy ? pendingKey : null, error, success, setError, setSuccess };
}
