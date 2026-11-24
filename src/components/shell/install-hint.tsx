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
          setPrompt(null);
        }}
      >
        {strings.install.action}
      </Button>
      <button
        type="button"
        onClick={() => setPrompt(null)}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-5" aria-hidden />
        <span className="sr-only">{strings.install.dismiss}</span>
      </button>
    </div>
  );
}
