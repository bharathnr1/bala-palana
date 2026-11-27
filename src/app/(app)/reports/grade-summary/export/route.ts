import { NextResponse } from "next/server";

import { toCsv } from "@/lib/csv";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { gradeSubjectSummary } from "@/server/reports/queries";

/**
 * CSV for the grade summary (M4-04). It takes the same filters as the page;
 * the generic exporter replaces it in M8-03. The permission check is the same
 * server-side one the page makes.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await requireUser();
  try {
    assertCan(user, "report.read");
  } catch (error) {
    if (error instanceof AppError) return new Response(null, { status: 403 });
    throw error;
  }

  const params = new URL(request.url).searchParams;
  const year = params.get("year") ?? "";
  if (!/^\d{4}-\d{2}$/.test(year)) return new Response(null, { status: 400 });

  const grade = params.get("grade") || undefined;
  const term = params.get("term") || undefined;
  const rows = await gradeSubjectSummary(user, { academicYear: year, grade, term });

  const csv = toCsv(
    ["academic_year", "grade", "term", "subject", "avg_pct", "n"],
    rows.map((row) => [row.academicYear, row.grade, row.term, row.subject, row.avgPct, row.n]),
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="grade-summary-${year}.csv"`,
    },
  });
}
