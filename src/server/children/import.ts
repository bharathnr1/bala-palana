import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { duplicateKey, type ImportRow, type ImportSummary } from "@/lib/csv";
import type { Role } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import { getDb } from "@/server/db/client";
import { mutate, type Tx } from "@/server/db/mutate";
import { child, childGuardian, enrolment, guardian, lookup } from "@/server/db/schema";

import { currentAcademicYear } from "./queries";

/** Keys or labels are accepted: "grade_6" and "Grade 6" both work. */
async function resolveLookup(
  tx: Tx,
  kind: string,
  value: string | undefined,
): Promise<string | null> {
  if (!value?.trim()) return null;
  const needle = value.trim().toLowerCase();

  const [row] = await tx
    .select({ id: lookup.id })
    .from(lookup)
    .where(
      and(
        eq(lookup.kind, kind),
        sql`(lower(${lookup.key}) = ${needle} or lower(${lookup.label}) = ${needle})`,
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

async function existingKeys(names: string[]): Promise<Set<string>> {
  if (names.length === 0) return new Set();
  const rows = await getDb()
    .select({ fullName: child.fullName, dob: child.dob })
    .from(child)
    .where(inArray(sql`lower(${child.fullName})`, names));
  return new Set(rows.map((row) => duplicateKey({ full_name: row.fullName, dob: row.dob ?? "" })));
}

/**
 * Imports valid rows in one transaction (M0-10). A row whose name and date of
 * birth already exist is skipped, so the same file can be imported twice.
 * Lookup values that do not exist abort the whole import with their line.
 */
export async function importChildren(
  user: { id: string; role: Role },
  rows: ImportRow[],
): Promise<ImportSummary> {
  assertCan(user, "child.import");

  if (rows.length === 0) throw new AppError("INVALID", strings.children.import.empty);

  const names = [...new Set(rows.map((row) => row.full_name.trim().toLowerCase()))];
  const existing = await existingKeys(names);
  const academicYear = await currentAcademicYear();

  return mutate(user, async (tx) => {
    let imported = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      const key = duplicateKey(row);
      if (existing.has(key)) {
        skipped += 1;
        continue;
      }

      const gradeId = await resolveLookup(tx, "grade", row.grade);
      if (row.grade && !gradeId) {
        throw new AppError("INVALID", strings.children.import.unknownLookup(index + 2, "grade", row.grade));
      }
      const groupId = await resolveLookup(tx, "group", row.group);
      if (row.group && !groupId) {
        throw new AppError("INVALID", strings.children.import.unknownLookup(index + 2, "group", row.group));
      }
      const relationId = await resolveLookup(tx, "relation", row.guardian_relation);
      if (row.guardian_relation && !relationId) {
        throw new AppError(
          "INVALID",
          strings.children.import.unknownLookup(index + 2, "relation", row.guardian_relation),
        );
      }

      const [created] = await tx
        .insert(child)
        .values({
          fullName: row.full_name,
          preferredName: row.preferred_name ?? null,
          dob: row.dob ?? null,
          stage: row.stage,
          consentGivenAt: row.stage === "student" ? new Date() : null,
        })
        .returning({ id: child.id });
      if (!created) throw new AppError("INVALID", strings.errors.unexpected);

      if (row.guardian_name) {
        const [parent] = await tx
          .insert(guardian)
          .values({ name: row.guardian_name, phone: row.guardian_phone ?? null })
          .returning({ id: guardian.id });
        if (!parent) throw new AppError("INVALID", strings.errors.unexpected);
        await tx.insert(childGuardian).values({
          childId: created.id,
          guardianId: parent.id,
          relationId,
          isPrimary: true,
        });
      }

      if (gradeId || groupId || row.outside_school) {
        await tx.insert(enrolment).values({
          childId: created.id,
          academicYear,
          gradeId,
          groupId,
          outsideSchool: row.outside_school ?? null,
        });
      }

      existing.add(key);
      imported += 1;
    }

    return { imported, skipped, lines: rows.length };
  });
}
