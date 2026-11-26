"use client";

import { Mic, RotateCcw, Send, Square, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { childIdFromPath, formatDuration, MAX_FEEDBACK_SECONDS } from "@/lib/feedback";
import { uploadFile } from "@/lib/file-upload";
import { strings } from "@/lib/strings";
import { beginFeedbackAction, saveFeedbackAction } from "@/server/feedback/actions";

type RecorderState = "idle" | "requesting" | "recording" | "ready" | "sending";

const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/webm";
const UPLOAD_TYPE = "audio/webm";

/**
 * The floating feedback mic on every page (04-ui-spec § Navigation, M1-02).
 * It records up to three minutes, previews the take, then uploads it through a
 * signed URL and stores the row with its page context.
 */
export function FeedbackRecorder() {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const previewRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  // Bumped whenever the dialog resets, so a late permission grant cannot start
  // recording into a dialog the user has already closed.
  const generationRef = useRef(0);

  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const childId = childIdFromPath(pathname ?? "");

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    blobRef.current = null;
    setPreviewUrl(null);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function reset() {
    generationRef.current += 1;
    discardRef.current = true;
    stopRecording();
    recorderRef.current = null;
    stopTracks();
    clearPreview();
    chunksRef.current = [];
    setState("idle");
    setElapsed(0);
    setDuration(0);
    setError(null);
    setSaved(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  // Stop automatically at the three-minute cap (M1-02).
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - startedAtRef.current) / 1000;
      setElapsed(Math.min(seconds, MAX_FEEDBACK_SECONDS));
      if (seconds >= MAX_FEEDBACK_SECONDS) stopRecording();
    }, 250);
    return () => window.clearInterval(timer);
  }, [state]);

  async function startRecording() {
    const generation = generationRef.current;
    setError(null);
    setSaved(false);
    clearPreview();
    chunksRef.current = [];

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(strings.feedback.record.unsupported);
      setState("idle");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME)
      ? PREFERRED_MIME
      : MediaRecorder.isTypeSupported(FALLBACK_MIME)
        ? FALLBACK_MIME
        : null;
    if (!mimeType) {
      setError(strings.feedback.record.unsupported);
      setState("idle");
      return;
    }

    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks();
        if (discardRef.current) {
          discardRef.current = false;
          return;
        }

        const blob = new Blob(chunksRef.current, { type: UPLOAD_TYPE });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError(strings.feedback.record.empty);
          setState("idle");
          return;
        }

        const seconds = Math.min(
          MAX_FEEDBACK_SECONDS,
          Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000)),
        );
        const url = URL.createObjectURL(blob);
        previewRef.current = url;
        blobRef.current = blob;
        setPreviewUrl(url);
        setDuration(seconds);
        setState("ready");
      };
      recorder.onerror = () => {
        // A fatal recorder error can also fire `onstop`; discard that take and
        // return to a usable idle state with an explanation.
        discardRef.current = true;
        stopTracks();
        setError(strings.feedback.record.recordingFailed);
        setState("idle");
      };

      discardRef.current = false;
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      setElapsed(0);
      recorder.start(1000);
      setState("recording");
    } catch (caught) {
      if (generation !== generationRef.current) return;
      stopTracks();
      setState("idle");
      const denied =
        caught instanceof DOMException &&
        (caught.name === "NotAllowedError" ||
          caught.name === "SecurityError" ||
          caught.name === "NotSupportedError");
      setError(
        denied ? strings.feedback.record.permissionDenied : strings.feedback.record.micFailed,
      );
    }
  }

  async function sendRecording() {
    if (!blobRef.current) return;
    setState("sending");
    setError(null);

    try {
      const begin = await beginFeedbackAction(new FormData());
      if (!begin.ok) {
        setError(begin.error.message);
        setState("ready");
        return;
      }

      await uploadFile(begin.data.uploadUrl, blobRef.current, UPLOAD_TYPE);

      const form = new FormData();
      form.set("id", begin.data.id);
      form.set("durationS", String(duration));
      form.set("route", pathname || "/");
      if (childId) form.set("childId", childId);

      const result = await saveFeedbackAction(form);
      if (!result.ok) {
        setError(result.error.message);
        setState("ready");
        return;
      }

      clearPreview();
      setSaved(true);
      setState("idle");
      router.refresh();
    } catch {
      setError(strings.feedback.record.failed);
      setState("ready");
    }
  }

  function openRecorder() {
    reset();
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={openRecorder}
        aria-label={strings.feedback.record.open}
        className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex size-12 items-center justify-center rounded-full shadow-lg md:right-6 md:bottom-6"
      >
        <Mic className="size-5" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        onClose={reset}
        aria-labelledby="feedback-recorder-title"
        className="border-border bg-background text-foreground backdrop:bg-foreground/40 m-auto w-[min(92vw,28rem)] rounded-2xl border p-4 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id="feedback-recorder-title" className="text-lg font-semibold">
            {strings.feedback.record.title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={strings.feedback.record.close}
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden />
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">{strings.feedback.record.hint}</p>

        {error ? (
          <Alert tone="error" className="mt-3">
            {error}
          </Alert>
        ) : null}
        {saved ? (
          <Alert tone="success" className="mt-3">
            {strings.feedback.record.saved}
          </Alert>
        ) : null}

        <div className="mt-4 space-y-3">
          {state === "idle" && !saved ? (
            <Button type="button" className="h-12 w-full" onClick={startRecording} autoFocus>
              <Mic aria-hidden />
              {strings.feedback.record.start}
            </Button>
          ) : null}

          {state === "requesting" ? (
            <Button type="button" className="h-12 w-full" loading>
              {strings.feedback.record.starting}
            </Button>
          ) : null}

          {state === "recording" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="bg-destructive size-2 animate-pulse rounded-full" aria-hidden />
                  {strings.feedback.record.recording}
                </span>
                <span role="timer" className="font-mono text-lg tabular-nums">
                  {formatDuration(elapsed)}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    {strings.feedback.record.ofMax(formatDuration(MAX_FEEDBACK_SECONDS))}
                  </span>
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="h-12 w-full"
                onClick={stopRecording}
              >
                <Square aria-hidden />
                {strings.feedback.record.stop}
              </Button>
            </>
          ) : null}

          {state === "ready" ? (
            <>
              <audio controls src={previewUrl ?? undefined} className="w-full" />
              <p className="text-muted-foreground text-sm">
                {strings.feedback.record.duration}: {formatDuration(duration)}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={startRecording}
                >
                  <RotateCcw aria-hidden />
                  {strings.feedback.record.reRecord}
                </Button>
                <Button type="button" className="h-12 flex-1" onClick={sendRecording}>
                  <Send aria-hidden />
                  {strings.feedback.record.send}
                </Button>
              </div>
            </>
          ) : null}

          {state === "sending" ? (
            <Button type="button" className="h-12 w-full" loading>
              {strings.feedback.record.sending}
            </Button>
          ) : null}

          {saved ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={() => dialogRef.current?.close()}
            >
              {strings.feedback.record.close}
            </Button>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
