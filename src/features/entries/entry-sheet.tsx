"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/alert";
import { Button } from "@/components/ui/button";
import { FollowUpChips } from "@/components/follow-up-chips";
import { formatDate, formatDateTimeIST, relativeDueLabel } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import {
  addEntryFollowUp,
  changeEntryStatus,
  createEntry,
  editEntry,
  removeEntry,
} from "@/server/entries/actions";
import type { EntryListItem, EntryThread } from "@/server/entries/queries";

const INPUT = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

type Mode = "view" | "edit" | "followUp" | "corrective";

/**
 * The entry sheet (M2-04): the full entry, its thread, and the actions the
 * reader's role allows. The server enforces every action again, so hiding a
 * button is only ever a convenience (03 § Rules beyond the matrix).
 */
export function EntrySheet({
  thread,
  backHref,
  canEdit,
  canDelete,
  canClose,
  canCreate,
}: {
  thread: EntryThread;
  backHref: string;
  canEdit: boolean;
  canDelete: boolean;
  canClose: boolean;
  canCreate: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [note, setNote] = useState(thread.entry.note ?? "");
  const [followUpOn, setFollowUpOn] = useState(thread.entry.followUpOn ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close(): void {
    dialogRef.current?.close();
  }

  function run(
    action: (formData: FormData) => Promise<ActionResult<unknown>>,
    formData: FormData,
    after?: () => void,
  ): void {
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setMode("view");
      after?.();
      router.refresh();
    });
  }

  function submitFollowUp(formData: FormData): void {
    run(addEntryFollowUp, formData);
  }

  function submitCorrective(formData: FormData): void {
    run(createEntry, formData);
  }

  function submitEdit(formData: FormData): void {
    run(editEntry, formData);
  }

  function toggleStatus(): void {
    const formData = new FormData();
    formData.set("id", thread.entry.id);
    formData.set("status", thread.entry.status === "open" ? "closed" : "open");
    run(changeEntryStatus, formData);
  }

  function submitDelete(): void {
    const formData = new FormData();
    formData.set("id", thread.entry.id);
    run(removeEntry, formData, close);
  }

  const isOpen = thread.entry.status === "open";
  const canAddCorrective = canCreate && thread.entry.categoryKey === "concern";
  const followUpTarget = thread.entry.parentId ?? thread.entry.id;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => router.replace(backHref)}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-0 mt-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-background p-0 backdrop:bg-foreground/30 sm:m-auto sm:rounded-2xl"
      aria-label={thread.entry.categoryLabel}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{thread.entry.categoryLabel}</p>
            <p className="text-xs text-muted-foreground">
              {thread.entry.authorName} · {formatDateTimeIST(thread.entry.occurredAt)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="size-11"
            onClick={close}
            aria-label={strings.entries.sheet.close}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>

        {thread.parent ? (
          <ThreadLine entry={thread.parent} label={strings.entries.sheet.parent} />
        ) : null}

        <div className="space-y-2">
          {mode === "edit" ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitEdit(new FormData(event.currentTarget));
              }}
            >
              <input type="hidden" name="id" value={thread.entry.id} />
              <label htmlFor="entry-edit-note" className="text-sm font-medium">
                {strings.entries.sheet.editNote}
              </label>
              <textarea
                id="entry-edit-note"
                name="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={INPUT}
              />
              <FollowUpChips value={followUpOn} onChange={setFollowUpOn} />
              <input type="hidden" name="followUpOn" value={followUpOn} />
              <div className="flex gap-2">
                <Button type="submit" className="h-11" loading={isPending}>
                  {isPending ? strings.entries.sheet.saving : strings.entries.sheet.saveEdit}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setMode("view")}>
                  {strings.entries.sheet.cancel}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {thread.entry.note ? (
                <p className="text-sm whitespace-pre-wrap">{thread.entry.note}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {thread.entry.subjectLabel ? (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {thread.entry.subjectLabel}
                  </span>
                ) : null}
                {thread.entry.tags.map((tag) => (
                  <span
                    key={tag.key}
                    className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
                  >
                    {tag.label}
                  </span>
                ))}
                {thread.entry.followUpOn ? (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {isOpen ? strings.entries.timeline.open : strings.entries.timeline.closed} ·{" "}
                    {strings.entries.timeline.followUp(
                      isOpen
                        ? relativeDueLabel(thread.entry.followUpOn)
                        : formatDate(thread.entry.followUpOn),
                    )}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>

        {thread.replies.length > 0 ? <ThreadList replies={thread.replies} /> : null}

        {error ? <Alert tone="error">{error}</Alert> : null}

        {mode === "view" ? (
          <div className="flex flex-wrap gap-2">
            {canCreate ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setMode("followUp")}
              >
                {strings.entries.sheet.addFollowUp}
              </Button>
            ) : null}
            {canAddCorrective ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setMode("corrective")}
              >
                {strings.entries.sheet.addCorrective}
              </Button>
            ) : null}
            {canClose && thread.entry.status ? (
              <Button type="button" variant="outline" className="h-11" loading={isPending} onClick={toggleStatus}>
                {isOpen ? strings.entries.sheet.closeEntry : strings.entries.sheet.reopenEntry}
              </Button>
            ) : null}
            {canEdit ? (
              <Button type="button" variant="outline" className="h-11" onClick={() => setMode("edit")}>
                {strings.entries.sheet.edit}
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 text-destructive"
                loading={isPending}
                onClick={submitDelete}
              >
                {strings.entries.sheet.delete}
              </Button>
            ) : null}
          </div>
        ) : null}

        {mode === "followUp" || mode === "corrective" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              if (mode === "followUp") submitFollowUp(formData);
              else submitCorrective(formData);
            }}
          >
            {mode === "followUp" ? (
              <input type="hidden" name="parentId" value={followUpTarget} />
            ) : (
              <>
                <input type="hidden" name="childIds" value={thread.entry.childId} />
                <input type="hidden" name="categoryKey" value="corrective_action" />
                <input type="hidden" name="parentId" value={thread.entry.id} />
              </>
            )}
            <label htmlFor="entry-sheet-note" className="text-sm font-medium">
              {strings.entries.sheet.followUpNote}
            </label>
            <textarea
              id="entry-sheet-note"
              name="note"
              rows={3}
              required
              placeholder={strings.entries.sheet.notePlaceholder}
              className={INPUT}
            />
            <FollowUpChips value={followUpOn} onChange={setFollowUpOn} />
            <input type="hidden" name="followUpOn" value={followUpOn} />
            <div className="flex gap-2">
              <Button type="submit" className="h-11" loading={isPending}>
                {isPending ? strings.entries.sheet.saving : strings.entries.sheet.save}
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setMode("view")}>
                {strings.entries.sheet.cancel}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </dialog>
  );
}

function ThreadLine({ entry, label }: { entry: EntryListItem; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{entry.note}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {entry.authorName} · {formatDateTimeIST(entry.occurredAt)}
      </p>
    </div>
  );
}

function ThreadList({ replies }: { replies: EntryListItem[] }) {
  return (
    <section aria-label={strings.entries.sheet.thread} className="space-y-2">
      <h3 className="text-sm font-semibold">{strings.entries.sheet.thread}</h3>
      {replies.length === 0 ? (
        <p className="text-sm text-muted-foreground">{strings.entries.sheet.repliesEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {replies.map((reply) => (
            <li key={reply.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="whitespace-pre-wrap">{reply.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reply.categoryLabel} · {reply.authorName} ·{" "}
                {formatDateTimeIST(reply.occurredAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
