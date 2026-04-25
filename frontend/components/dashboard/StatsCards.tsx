import { Briefcase, Cpu, Users, Wallet } from "lucide-react";
import { Card } from "../ui/Card";

export const StatsCards = ({ data }: { data: { totalJobs: number; activeJobs: number; totalApplicants: number; totalScreenings: number } }) => {
  const items = [
    { label: "Total Jobs", value: data.totalJobs, icon: Briefcase },
    { label: "Active Jobs", value: data.activeJobs, icon: Wallet },
    { label: "Total Applicants", value: data.totalApplicants, icon: Users },
    { label: "Screenings", value: data.totalScreenings, icon: Cpu },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-brand-900">{item.value}</p>
          </Card>
        );
      })}
    </div>
  );
};
