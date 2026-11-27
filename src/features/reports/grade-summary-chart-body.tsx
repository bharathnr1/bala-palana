"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { SubjectAverage } from "@/lib/grade-summary";

/** The bars themselves, in their own module so Recharts is lazy-loaded. */
export default function GradeSummaryChartBody({ rows }: { rows: SubjectAverage[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="subject"
          interval={0}
          angle={-30}
          textAnchor="end"
          tick={{ fontSize: 12 }}
          height={52}
        />
        <YAxis domain={[0, 100]} unit="%" width={44} tick={{ fontSize: 12 }} />
        <Bar dataKey="pct" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
