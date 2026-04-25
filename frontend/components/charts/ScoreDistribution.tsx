"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const ScoreDistribution = ({ data }: { data: Array<{ range: string; count: number }> }) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count">
          {data.map((_, i) => (
            <Cell key={i} fill={i <= 1 ? "#ef4444" : i <= 3 ? "#f59e0b" : "#22c55e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);
