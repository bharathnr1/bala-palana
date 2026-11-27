"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/**
 * The trend line itself. Kept in its own module so the tab can lazy-load
 * Recharts (01-conventions § UI: lazy-load charts).
 */
export default function SubjectSparklineChart({
  points,
}: {
  points: { termLabel: string; pct: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis domain={[0, 100]} hide />
        <Line
          type="monotone"
          dataKey="pct"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
