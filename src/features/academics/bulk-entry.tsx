"use client";

import { useRef, useState } from "react";

import {
  isBlankValues,
  validateAssessmentValues,
  type AssessmentErrors,
  type AssessmentValues,
} from "@/lib/assessment-rules";
import { strings } from "@/lib/strings";
import { removeAssessment, saveAssessment } from "@/server/academics/actions";

export type BulkEntryRow = {
  childId: string;
  childName: string;
  id: string | null;
  values: AssessmentValues;
};

type RowStatus = "idle" | "saving" | "saved" | "error";

const INPUT = "mt-1 h-11 w-full rounded-lg border border-input bg-background px-2";

function statusLabel(status: RowStatus): string {
  if (status === "saving") return strings.academics.saving;
  if (status === "saved") return strings.academics.saved;
  if (status === "error") return strings.academics.saveFailed;
  return "";
}

/** What a read-only reader sees instead of inputs. */
function describe(values: AssessmentValues): string {
  const parts: string[] = [];
  if (values.marks.trim() !== "") {
    parts.push(
      values.maxMarks.trim() !== ""
        ? `${strings.academics.marks} ${values.marks}/${values.maxMarks}`
        : `${strings.academics.marks} ${values.marks}`,
    );
  }
  if (values.gradeLetter.trim() !== "") parts.push(values.gradeLetter.trim());
  if (values.remark.trim() !== "") parts.push(values.remark.trim());
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function rowSignature(row: BulkEntryRow): string {
  const { marks, maxMarks, gradeLetter, remark } = row.values;
  return JSON.stringify([row.id, marks, maxMarks, gradeLetter, remark]);
}

/**
 * Bulk entry (M4-02): one row per child in the chosen class, saved on blur
 * without leaving the page. The server action carries the whole row, so the
 * upsert replaces exactly what is on screen.
 */
export function BulkEntry({
  academicYear,
  gradeKey,
  termKey,
  subjectKey,
  rows,
  canWrite,
}: {
  academicYear: string;
  gradeKey: string;
  termKey: string;
  subjectKey: string;
  rows: BulkEntryRow[];
  canWrite: boolean;
}) {
  const [entries, setEntries] = useState<Record<string, BulkEntryRow>>(() =>
    Object.fromEntries(rows.map((row) => [row.childId, row])),
  );
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [errors, setErrors] = useState<Record<string, AssessmentErrors>>({});

  // Autosave reads the newest values, not the ones captured when it was queued.
  // The ref is updated before the state, so a blur handler always sees the
  // value the reader just typed.
  const latest = useRef(entries);
  const savedSignatures = useRef<Record<string, string>>(
    Object.fromEntries(rows.map((row) => [row.childId, rowSignature(row)])),
  );
  // One save at a time per row, so a fast tab through fields cannot race.
  const chains = useRef<Record<string, Promise<void>>>({});

  function write(childId: string, patch: Partial<BulkEntryRow>): void {
    const current = latest.current;
    const row = current[childId];
    if (!row) return;
    const next = { ...current, [childId]: { ...row, ...patch } };
    latest.current = next;
    setEntries(next);
  }

  function signatureOf(childId: string): string | null {
    const row = latest.current[childId];
    return row ? rowSignature(row) : null;
  }

  function update(childId: string, field: keyof AssessmentValues, value: string): void {
    const row = latest.current[childId];
    if (!row) return;
    write(childId, { values: { ...row.values, [field]: value } });
    setStatuses((current) => ({ ...current, [childId]: "idle" }));
  }

  function setStatus(childId: string, status: RowStatus): void {
    setStatuses((current) => ({ ...current, [childId]: status }));
  }

  function rememberMax(childId: string, maxMarks: string): void {
    if (maxMarks.trim() === "") return;
    const current = latest.current;
    let changed = false;
    const next: Record<string, BulkEntryRow> = {};
    for (const [key, row] of Object.entries(current)) {
      if (key !== childId && row.values.maxMarks.trim() === "") {
        next[key] = { ...row, values: { ...row.values, maxMarks } };
        changed = true;
      } else {
        next[key] = row;
      }
    }
    if (!changed) return;
    latest.current = next;
    setEntries(next);
  }

  async function persist(childId: string): Promise<void> {
    const row = latest.current[childId];
    if (!row) return;

    // A cleared row is a deletion, not an invalid value.
    if (isBlankValues(row.values)) {
      setErrors((current) => ({ ...current, [childId]: {} }));
      if (!row.id) return;

      setStatus(childId, "saving");
      const form = new FormData();
      form.set("id", row.id);
      const result = await removeAssessment(form);
      if (result.ok) {
        write(childId, { id: null });
        savedSignatures.current[childId] = signatureOf(childId) ?? "";
        setStatus(childId, "saved");
      } else {
        setErrors((current) => ({
          ...current,
          [childId]: { form: result.error.message },
        }));
        setStatus(childId, "error");
      }
      return;
    }

    const validation = validateAssessmentValues(row.values);
    setErrors((current) => ({ ...current, [childId]: validation }));
    if (Object.keys(validation).length > 0) return;

    setStatus(childId, "saving");
    const form = new FormData();
    form.set("childId", childId);
    form.set("academicYear", academicYear);
    form.set("gradeKey", gradeKey);
    form.set("termKey", termKey);
    form.set("subjectKey", subjectKey);
    form.set("marks", row.values.marks);
    form.set("maxMarks", row.values.maxMarks);
    form.set("gradeLetter", row.values.gradeLetter);
    form.set("remark", row.values.remark);

    const result = await saveAssessment(form);
    if (result.ok) {
      write(childId, { id: result.data.id });
      savedSignatures.current[childId] = signatureOf(childId) ?? "";
      rememberMax(childId, latest.current[childId]?.values.maxMarks ?? "");
      setStatus(childId, "saved");
    } else {
      setErrors((current) => ({
        ...current,
        [childId]: { form: result.error.message },
      }));
      setStatus(childId, "error");
    }
  }

  function queueSave(childId: string): void {
    if (!canWrite) return;
    const signature = signatureOf(childId);
    if (signature === null || savedSignatures.current[childId] === signature) return;

    chains.current[childId] = (chains.current[childId] ?? Promise.resolve())
      .then(() => persist(childId))
      .catch(() => setStatus(childId, "error"));
  }

  return (
    <ul className="space-y-3">
      {rows.map((initial) => {
        const row = entries[initial.childId] ?? initial;
        const rowErrors = errors[initial.childId] ?? {};
        const status = statuses[initial.childId] ?? "idle";

        return (
          <li key={initial.childId} className="border-border rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 font-medium">{row.childName}</span>
              <span
                aria-live="polite"
                className={
                  status === "error"
                    ? "text-destructive shrink-0 text-xs"
                    : "text-muted-foreground shrink-0 text-xs"
                }
              >
                {statusLabel(status)}
              </span>
            </div>

            {canWrite ? (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field
                  id={`${initial.childId}-marks`}
                  label={strings.academics.marks}
                  value={row.values.marks}
                  error={rowErrors.marks}
                  inputMode="decimal"
                  onChange={(value) => update(initial.childId, "marks", value)}
                  onBlur={() => queueSave(initial.childId)}
                />
                <Field
                  id={`${initial.childId}-max`}
                  label={strings.academics.maxMarks}
                  value={row.values.maxMarks}
                  error={rowErrors.maxMarks}
                  inputMode="decimal"
                  onChange={(value) => update(initial.childId, "maxMarks", value)}
                  onBlur={() => queueSave(initial.childId)}
                />
                <Field
                  id={`${initial.childId}-letter`}
                  label={strings.academics.gradeLetter}
                  value={row.values.gradeLetter}
                  error={rowErrors.gradeLetter}
                  onChange={(value) => update(initial.childId, "gradeLetter", value)}
                  onBlur={() => queueSave(initial.childId)}
                />
                <Field
                  id={`${initial.childId}-remark`}
                  label={strings.academics.remark}
                  value={row.values.remark}
                  error={rowErrors.remark}
                  onChange={(value) => update(initial.childId, "remark", value)}
                  onBlur={() => queueSave(initial.childId)}
                />
              </div>
            ) : (
              <p className="text-muted-foreground mt-1 text-sm">{describe(row.values)}</p>
            )}

            {rowErrors.form ? (
              <p role="alert" className="text-destructive mt-2 text-sm">
                {rowErrors.form}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Field({
  id,
  label,
  value,
  error,
  inputMode,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  inputMode?: "decimal";
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={INPUT}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
