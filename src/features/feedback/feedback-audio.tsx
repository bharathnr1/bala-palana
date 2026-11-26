"use client";

import { useState, useTransition } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { feedbackAudioAction } from "@/server/feedback/actions";

/**
 * Audio is private, so its five-minute signed URL is minted only when the
 * admin presses play (D16). The element clears on expiry and can be reloaded.
 */
export function FeedbackAudio({ id, available }: { id: string; available: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!available) {
    return <p className="text-muted-foreground text-sm">{strings.feedback.list.audioRemoved}</p>;
  }

  function load() {
    startTransition(async () => {
      const form = new FormData();
      form.set("id", id);

      const result = await feedbackAudioAction(form);
      if (result.ok) {
        setUrl(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
    });
  }

  if (!url) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" className="h-11" onClick={load} loading={pending}>
          {pending ? strings.feedback.list.loadingAudio : strings.feedback.list.play}
        </Button>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    );
  }

  return (
    <audio
      controls
      autoPlay
      src={url}
      className="w-full"
      onError={() => {
        setUrl(null);
        setError(strings.feedback.list.audioUnavailable);
      }}
    />
  );
}
