import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

const STROKE = "#2563eb";

export const ScoreBreakdownChart = ({ breakdown }: { breakdown: { skillsMatch: number; experienceMatch: number; educationMatch: number; culturalFit: number } }) => {
  const data = [
    { metric: "Skills", value: breakdown.skillsMatch },
    { metric: "Experience", value: breakdown.experienceMatch },
    { metric: "Education", value: breakdown.educationMatch },
    { metric: "Culture", value: breakdown.culturalFit },
  ];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#bfdbfe" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#475569", fontSize: 12 }} />
          <Radar dataKey="value" stroke={STROKE} fill={STROKE} fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
