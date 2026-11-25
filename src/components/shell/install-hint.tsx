"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/** Chrome's install event, which is not part of the standard DOM types. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// "Not now" is a decision, not a request to be asked again next visit.
const DISMISSED_KEY = "bala-palana:install-hint-dismissed";

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode); the hint simply shows again.
  }
}

/**
 * "Install app" hint on Home (04-ui-spec § PWA). Android Chrome fires
 * `beforeinstallprompt` when the app is installable; a user already running it
 * from the home screen never sees the hint.
 */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (isDismissed()) return;
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{strings.install.title}</p>
        <p className="text-sm text-muted-foreground">{strings.install.body}</p>
      </div>
      <Button
        type="button"
        className="h-11"
        onClick={async () => {
          await prompt.prompt();
          rememberDismissal();
          setPrompt(null);
        }}
      >
        {strings.install.action}
      </Button>
      <button
        type="button"
        onClick={() => {
          rememberDismissal();
          setPrompt(null);
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-5" aria-hidden />
        <span className="sr-only">{strings.install.dismiss}</span>
      </button>
    </div>
  );
}
