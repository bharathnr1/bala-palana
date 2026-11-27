"use client";

import dynamic from "next/dynamic";

import { strings } from "@/lib/strings";

const Chart = dynamic(() => import("./subject-sparkline-chart"), {
  ssr: false,
  loading: () => null,
});

/**
 * One subject's percentage across the terms (M4-03). The line is decorative;
 * the latest value is always written out for screen readers and small screens.
 */
export function SubjectSparkline({
  label,
  points,
}: {
  label: string;
  points: { termLabel: string; pct: number }[];
}) {
  const latest = points.at(-1);

  return (
    <figure className="flex items-center gap-3 rounded-xl border border-border p-3">
      <figcaption className="min-w-0 flex-1 truncate text-sm">{label}</figcaption>
      <div aria-hidden className="h-12 w-24 shrink-0">
        <Chart points={points} />
      </div>
      <span className="shrink-0 text-sm text-muted-foreground">
        {latest ? strings.academics.tab.trend(latest.termLabel, latest.pct) : ""}
      </span>
    </figure>
  );
}
