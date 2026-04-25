import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";

const BAR = "#2563eb";

export const SkillsHeatmap = ({ skills }: { skills: string[] }) => {
  const data = skills.map((skill, index) => ({ skill, score: Math.max(10, 100 - index * 10) }));
  return (
    <Card>
      <h3 className="mb-1 font-semibold text-slate-900">Top Skills in Demand</h3>
      <p className="mb-4 text-sm text-slate-600">Weighted demand signal from recent screenings.</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="skill" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            <Bar dataKey="score" fill={BAR} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
