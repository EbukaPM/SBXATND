"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function WeeklyTrendChart({ data }: { data: { date: string; present: number; late: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => v.slice(5)}
          fontSize={12}
          stroke="var(--muted-foreground)"
        />
        <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
        <Tooltip />
        <Line type="monotone" dataKey="present" stroke="var(--primary)" strokeWidth={2} name="Present" />
        <Line type="monotone" dataKey="late" stroke="#dc2626" strokeWidth={2} name="Late" />
      </LineChart>
    </ResponsiveContainer>
  );
}
