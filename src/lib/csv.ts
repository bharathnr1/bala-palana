import { z } from "zod";

import { CHILD_STAGES } from "./children";
import { strings } from "./strings";

/**
 * CSV import (M0-10). The parser is a small RFC 4180 reader: no dependency,
 * quoted fields, embedded commas and newlines, both CRLF and LF.
 */

export const IMPORT_COLUMNS = [
  "full_name",
  "preferred_name",
  "dob",
  "stage",
  "grade",
  "group",
  "outside_school",
  "guardian_name",
  "guardian_phone",
  "guardian_relation",
  "consent",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** The file the admin downloads and fills in. */
export const IMPORT_TEMPLATE = [
  IMPORT_COLUMNS.join(","),
  "Ananya Sharma,,2015-04-12,student,grade_6,,Sunrise School,Meera Sharma,9876543210,mother,yes",
  "",
].join("\n");

/** Parses RFC 4180 text into rows. Unclosed quotes are treated as an error. */
export function parseCsv(text: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  const input = text.replace(/^﻿/, "");

  while (index < input.length) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\r" && next === "\n") {
      index += 2;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
    index += 1;
  }

  if (inQuotes) return { rows: [], error: "unclosed_quote" };

  // A trailing newline ends the last row; anything else is unfinished content.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return { rows: rows.filter((entry) => entry.some((value) => value.trim() !== "")) };
}

const date = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, strings.children.errors.date)
    .optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(200).optional(),
);

export const importRowSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200),
    preferred_name: optionalText,
    dob: date,
    stage: z.enum(CHILD_STAGES).default("student"),
    grade: optionalText,
    group: optionalText,
    outside_school: optionalText,
    guardian_name: optionalText,
    guardian_phone: optionalText,
    guardian_relation: optionalText,
    consent: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z.enum(["yes", "no", ""]).optional(),
    ),
  })
  // Consent is recorded, never assumed: a student row must say yes (03).
  .refine((row) => row.stage !== "student" || row.consent === "yes", {
    message: "consent must be yes for a student",
    path: ["consent"],
  });

export type ImportRow = z.infer<typeof importRowSchema>;

export type ParsedImport = {
  header: string[];
  rows: { line: number; values: Record<string, string>; errors: string[] }[];
  error?: string;
};

/**
 * Header-driven parse: order does not matter, missing columns are allowed
 * except `full_name`, unknown columns are ignored.
 */
export function parseImport(text: string): ParsedImport {
  const parsed = parseCsv(text);
  if (parsed.error) return { header: [], rows: [], error: parsed.error };
  const [headerRow, ...dataRows] = parsed.rows;
  if (!headerRow) return { header: [], rows: [], error: "empty" };

  const header = headerRow.map((cell) => cell.trim().toLowerCase());
  if (!header.includes("full_name")) return { header, rows: [], error: "missing_full_name" };

  const rows = dataRows.map((cells, index) => {
    const values: Record<string, string> = {};
    header.forEach((name, position) => {
      values[name] = cells[position] ?? "";
    });

    const result = importRowSchema.safeParse(values);
    return {
      line: index + 2, // header is line 1
      values,
      errors: result.success
        ? []
        : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  });

  return { header, rows };
}

/** Fields that identify an existing child, so a re-import changes nothing. */
export function duplicateKey(row: { full_name: string; dob?: string }): string {
  return `${row.full_name.trim().toLowerCase()}|${row.dob ?? ""}`;
}

/**
 * RFC 4180 text for an export (M4-04). A cell is quoted when it holds a comma,
 * quote or newline, and a leading `=`, `+`, `-` or `@` gets a `'` so a
 * spreadsheet never evaluates a stored label as a formula.
 */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): string {
  const escape = (value: string | number | null): string => {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return `${[header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")}\r\n`;
}

/** What an import did: rows written, rows skipped as duplicates, rows read. */
export type ImportSummary = {
  imported: number;
  skipped: number;
  lines: number;
};
