"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { IMPORT_TEMPLATE, parseImport, type ImportSummary, type ParsedImport } from "@/lib/csv";
import { strings } from "@/lib/strings";
import type { ActionResult } from "@/server/auth/action";
import { importChildrenAction } from "@/server/children/import-actions";

const MAX_BYTES = 1_000_000;

function parseErrorText(code: string): string {
  if (code === "missing_full_name") return strings.children.import.missingFullName;
  if (code === "unclosed_quote") return strings.children.import.unclosedQuote;
  return strings.children.import.readError;
}

/**
 * CSV import (M0-10): parse and validate in the browser for a fast preview,
 * then post only the ticked rows. The server re-validates everything and
 * writes in one transaction.
 */
export function ImportPanel() {
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    (_previous: ActionResult<ImportSummary> | null, formData: FormData) =>
      importChildrenAction(formData),
    null,
  );

  const selected = (parsed?.rows ?? [])
    .filter((row) => included.has(row.line))
    .map((row) => row.values);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError(null);
    setParsed(null);
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setFileError(strings.children.import.fileTooBig);
      return;
    }

    try {
      const text = await file.text();
      const result = parseImport(text);
      setParsed(result);
      setIncluded(new Set(result.rows.filter((row) => row.errors.length === 0).map((row) => row.line)));
    } catch {
      setFileError(strings.children.import.readError);
    }
  }

  function toggle(line: number) {
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(IMPORT_TEMPLATE)}`}
          download="children-template.csv"
          className="text-sm underline"
        >
          {strings.children.import.download}
        </a>
        <p className="text-sm text-muted-foreground">{strings.children.import.hint}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="csv-file" className="text-sm font-medium">
          {strings.children.import.choose}
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full rounded-lg border border-input bg-background p-2 text-sm"
        />
        {fileError ? (
          <p role="alert" className="text-xs text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>

      {parsed?.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {parseErrorText(parsed.error)}
        </p>
      ) : null}

      {parsed && !parsed.error && parsed.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{strings.children.import.empty}</p>
      ) : null}

      {parsed && parsed.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <caption className="sr-only">{strings.children.import.title}</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="p-2">
                    {strings.children.import.row}
                  </th>
                  <th scope="col" className="p-2">
                    {strings.children.import.name}
                  </th>
                  <th scope="col" className="p-2">
                    {strings.children.import.dob}
                  </th>
                  <th scope="col" className="p-2">
                    {strings.children.import.grade}
                  </th>
                  <th scope="col" className="p-2">
                    {strings.children.import.guardian}
                  </th>
                  <th scope="col" className="hidden p-2 sm:table-cell">
                    {strings.children.import.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row) => {
                  const hasErrors = row.errors.length > 0;
                  return (
                    <tr key={row.line} className="border-b border-border align-top">
                      <td className="p-2">
                        <label className="flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={included.has(row.line)}
                            disabled={hasErrors}
                            onChange={() => toggle(row.line)}
                            aria-label={`${strings.children.import.row} ${row.line}`}
                            className="size-5"
                          />
                          {row.line}
                        </label>
                      </td>
                      <td className="p-2">
                        <span className="block">{row.values.full_name || "—"}</span>
                        {hasErrors ? (
                          <span className="block text-xs text-destructive">
                            {row.errors.join("; ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2">{row.values.dob || "—"}</td>
                      <td className="p-2">{row.values.grade || "—"}</td>
                      <td className="p-2">{row.values.guardian_name || "—"}</td>
                      <td className="hidden p-2 sm:table-cell">
                        {hasErrors ? (
                          <span className="text-xs text-destructive">{row.errors.join("; ")}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {strings.children.import.ok}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="rows" value={JSON.stringify(selected)} />
            <Button type="submit" className="h-11" disabled={pending || selected.length === 0}>
              {strings.children.import.submit}
            </Button>

            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground">{strings.children.import.emptySelection}</p>
            ) : null}

            {state && !state.ok ? (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error.message}
              </p>
            ) : null}

            {state?.ok ? (
              <p role="status" className="rounded-lg bg-secondary px-3 py-2 text-sm">
                {strings.children.import.summary(state.data.imported, state.data.skipped)}
              </p>
            ) : null}
          </form>
        </>
      ) : null}
    </div>
  );
}
