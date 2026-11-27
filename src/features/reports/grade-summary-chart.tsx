"use client";

import dynamic from "next/dynamic";

import type { SubjectAverage } from "@/lib/grade-summary";

const Chart = dynamic(() => import("./grade-summary-chart-body"), {
  ssr: false,
  loading: () => <div className="bg-muted h-full w-full animate-pulse rounded-xl" />,
});

/**
 * The report's chart (M4-04). It repeats the table visually, so it is hidden
 * from assistive technology; the table is the source of truth.
 */
export function GradeSummaryChart({ rows }: { rows: SubjectAverage[] }) {
  if (rows.length === 0) return null;
  return (
    <div aria-hidden className="h-64 w-full">
      <Chart rows={rows} />
    </div>
  );
}
