"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const SkillsDemandChart = ({ data }: { data: Array<{ skill: string; count: number }> }) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="skill" type="category" width={110} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
