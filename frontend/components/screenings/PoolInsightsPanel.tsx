import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";

const BAR = "#2563eb";

export const PoolInsightsPanel = ({
  distribution,
  recommendation,
}: {
  distribution: Array<{ range: string; count: number }>;
  recommendation: string;
}) => (
  <Card>
    <h3 className="font-semibold text-slate-900">Pool Insights</h3>
    <p className="mt-1 text-sm text-slate-600">Score distribution across the applicant pool.</p>
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution}>
          <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
          <Bar dataKey="count" fill={BAR} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-3 text-sm italic text-slate-600">{recommendation}</p>
  </Card>
);
