"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { Alert } from "@/components/alert";
import { ChildPicker, type PickerChild } from "@/components/child-picker";
import { ChipGroup } from "@/components/chip-group";
import { FollowUpChips } from "@/components/follow-up-chips";
import { Button } from "@/components/ui/button";
import { addDaysISO, todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { createEntry, removeEntry } from "@/server/entries/actions";
import type { ObserveLookups } from "@/server/entries/lookups";

type CreateResult = { ids: string[]; groupKey: string | null };

const INPUT = "h-11 w-full rounded-lg border border-input bg-background px-3";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The quick observation screen (M2-02, target ≤ 15 s): pick children, a
 * category, tags, a note and a follow-up, then one Save. Group saves share a
 * `group_key` (D23); Undo soft-deletes what this save created.
 */
export function ObserveForm({
  childList,
  lookups,
  initialChildIds,
}: {
  childList: readonly PickerChild[];
  lookups: ObserveLookups;
  initialChildIds: readonly string[];
}) {
  const [selected, setSelected] = useState<string[]>([...initialChildIds]);
  const [categoryKey, setCategoryKey] = useState(lookups.categories[0]?.key ?? "observation");
  const [tagKeys, setTagKeys] = useState<string[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [note, setNote] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [event, setEvent] = useState("");
  const [levelKey, setLevelKey] = useState("");
  const [resultKey, setResultKey] = useState("");
  const [areaKey, setAreaKey] = useState("");
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [undone, setUndone] = useState(false);
  const [isUndoing, startUndo] = useTransition();

  const [state, formAction, pending] = useActionState<ActionResult<CreateResult> | null, FormData>(
    async (_previous, formData) => (await createEntry(formData)) as ActionResult<CreateResult>,
    null,
  );

  const category = lookups.categories.find((row) => row.key === categoryKey);
  const showsSubject = categoryKey === "concern" || categoryKey === "academic";

  const tags = useMemo(
    () =>
      lookups.tags.filter((tag) => !tag.categories || tag.categories.includes(categoryKey)),
    [lookups.tags, categoryKey],
  );

  const details = useMemo(() => {
    if (categoryKey === "skill") {
      const area = lookups.skillAreas.find((row) => row.key === areaKey);
      return area ? { areaId: area.id } : {};
    }
    if (categoryKey === "achievement") {
      const level = lookups.achievementLevels.find((row) => row.key === levelKey);
      const result = lookups.achievementResults.find((row) => row.key === resultKey);
      return event && level && result
        ? { event, levelId: level.id, resultId: result.id }
        : {};
    }
    if (categoryKey === "responsibility") {
      return title && from ? { title, from, ...(to ? { to } : {}) } : {};
    }
    return {};
  }, [
    categoryKey,
    lookups.skillAreas,
    lookups.achievementLevels,
    lookups.achievementResults,
    areaKey,
    event,
    levelKey,
    resultKey,
    title,
    from,
    to,
  ]);

  const detailsReady =
    categoryKey === "skill"
      ? Boolean(areaKey)
      : categoryKey === "achievement"
        ? Boolean(event && levelKey && resultKey)
        : categoryKey === "responsibility"
          ? Boolean(title && from)
          : true;

  function toggleChild(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  function chooseCategory(key: string) {
    setCategoryKey(key);
    setSubjectKey("");
    setTagKeys((current) =>
      current.filter((tagKey) => {
        const tag = lookups.tags.find((row) => row.key === tagKey);
        return !tag?.categories || tag.categories.includes(key);
      }),
    );
    // A concern defaults to a one-week follow-up (04-ui-spec § Quick observation).
    if (key === "concern" && !followUpOn) setFollowUpOn(addDaysISO(todayISO(), 7));
  }

  function toggleTag(key: string) {
    setTagKeys((current) =>
      current.includes(key) ? current.filter((row) => row !== key) : [...current, key],
    );
  }

  // The toast stays for 10 seconds so Undo is within reach (04-ui-spec).
  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => setDismissed(true), 10_000);
    return () => clearTimeout(timer);
  }, [state]);

  function undo() {
    if (!state?.ok) return;
    const ids = state.data.ids;
    startUndo(async () => {
      for (const id of ids) {
        const formData = new FormData();
        formData.set("id", id);
        await removeEntry(formData);
      }
      setUndone(true);
      setDismissed(true);
    });
  }

  return (
    <form
      action={formAction}
      aria-busy={pending}
      onSubmit={() => {
        setDismissed(false);
        setUndone(false);
      }}
      className="max-w-2xl space-y-6 pb-28"
    >
      <input type="hidden" name="childIds" value={selected.join(",")} />
      <input type="hidden" name="categoryKey" value={categoryKey} />
      <input type="hidden" name="tagKeys" value={tagKeys.join(",")} />
      <input type="hidden" name="subjectKey" value={showsSubject ? subjectKey : ""} />
      <input type="hidden" name="followUpOn" value={followUpOn} />
      <input type="hidden" name="details" value={detailsReady ? JSON.stringify(details) : "{}"} />

      <ChildPicker childList={childList} selected={selected} onToggle={toggleChild} />

      <ChipGroup
        id="observe-category"
        label={strings.entries.observe.category}
        options={lookups.categories}
        selected={[categoryKey]}
        onToggle={chooseCategory}
      />

      <ChipGroup
        id="observe-tags"
        label={strings.entries.observe.tags}
        options={tags}
        selected={tagKeys}
        onToggle={toggleTag}
      />

      {showsSubject ? (
        <ChipGroup
          id="observe-subject"
          label={strings.entries.observe.subject}
          options={lookups.subjects}
          selected={subjectKey ? [subjectKey] : []}
          onToggle={(key) => setSubjectKey((current) => (current === key ? "" : key))}
        />
      ) : null}

      <Field id="observe-note" label={strings.entries.observe.note}>
        <textarea
          id="observe-note"
          name="note"
          rows={3}
          value={note}
          onChange={(change) => setNote(change.target.value)}
          className="w-full rounded-lg border border-input bg-background p-3"
        />
        <p className="text-xs text-muted-foreground">{strings.entries.observe.noteHint}</p>
      </Field>

      {categoryKey === "skill" ? (
        <Field id="observe-area" label={strings.entries.observe.details.area}>
          <select
            id="observe-area"
            value={areaKey}
            onChange={(change) => setAreaKey(change.target.value)}
            className={INPUT}
          >
            <option value="">—</option>
            {lookups.skillAreas.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {categoryKey === "achievement" ? (
        <div className="space-y-3">
          <Field id="observe-event" label={strings.entries.observe.details.event}>
            <input
              id="observe-event"
              value={event}
              maxLength={200}
              onChange={(change) => setEvent(change.target.value)}
              className={INPUT}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="observe-level" label={strings.entries.observe.details.level}>
              <select
                id="observe-level"
                value={levelKey}
                onChange={(change) => setLevelKey(change.target.value)}
                className={INPUT}
              >
                <option value="">—</option>
                {lookups.achievementLevels.map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="observe-result" label={strings.entries.observe.details.result}>
              <select
                id="observe-result"
                value={resultKey}
                onChange={(change) => setResultKey(change.target.value)}
                className={INPUT}
              >
                <option value="">—</option>
                {lookups.achievementResults.map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      ) : null}

      {categoryKey === "responsibility" ? (
        <div className="space-y-3">
          <Field id="observe-title" label={strings.entries.observe.details.title}>
            <input
              id="observe-title"
              value={title}
              maxLength={200}
              onChange={(change) => setTitle(change.target.value)}
              className={INPUT}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="observe-from" label={strings.entries.observe.details.from}>
              <input
                id="observe-from"
                type="date"
                value={from}
                onChange={(change) => setFrom(change.target.value)}
                className={INPUT}
              />
            </Field>
            <Field id="observe-to" label={`${strings.entries.observe.details.to} (${strings.children.optional})`}>
              <input
                id="observe-to"
                type="date"
                value={to}
                onChange={(change) => setTo(change.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        </div>
      ) : null}

      <FollowUpChips value={followUpOn} onChange={setFollowUpOn} />

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-border bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-2xl items-center gap-3 pr-16 md:pr-0">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {selected.length === 0
              ? strings.entries.observe.needChild
              : `${selected.length} · ${category?.label ?? ""}`}
          </p>
          <Button
            type="submit"
            className="h-11 min-w-28"
            loading={pending}
            disabled={selected.length === 0 || !detailsReady}
          >
            {pending ? strings.entries.observe.saving : strings.entries.observe.save}
          </Button>
        </div>
      </div>

      {state && !state.ok ? <Alert tone="error">{state.error.message}</Alert> : null}

      {state?.ok && !dismissed ? (
        <div
          role="status"
          className="animate-in fade-in slide-in-from-bottom-2 fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-sm shadow-lg duration-200 md:bottom-24 md:left-auto md:w-96"
        >
          <p className="flex-1">
            {undone ? strings.entries.observe.undone : strings.entries.observe.saved(state.data.ids.length)}
          </p>
          {!undone ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={isUndoing}
              onClick={undo}
              className="min-h-11 px-3 font-medium"
            >
              {strings.entries.observe.undo}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
