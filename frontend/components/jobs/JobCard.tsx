import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { Job } from "../../types";
import { CalendarDays, MapPin, Users, Building2 } from "lucide-react";

const empLabel = (t: Job["employmentType"]) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", remote: "Remote" })[t];

export const JobCard = ({ job }: { job: Job }) => {
  const router = useRouter();
  const statusAccent = job.status === "active" ? "border-l-emerald-500" : job.status === "draft" ? "border-l-amber-500" : "border-l-slate-400";

  return (
    <Card
      className={`cursor-pointer space-y-4 border-l-4 ${statusAccent} transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)]`}
      onMouseEnter={() => router.prefetch(`/jobs/${job._id}`)}
      onClick={() => router.push(`/jobs/${job._id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/jobs/${job._id}`);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
          {job.company ? <p className="text-sm text-slate-500">{job.company}</p> : null}
        </div>
        <Badge variant={job.status === "active" ? "success" : job.status === "draft" ? "warning" : "neutral"}>{job.status}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{job.requirements?.domain || "Department N/A"}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location || "Location N/A"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{empLabel(job.employmentType)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{job.applicantCount ?? 0} applicants</span>
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(job.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3" onClick={(e) => e.stopPropagation()}>
        <Link href={`/jobs/${job._id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
          <Button className="w-full rounded-lg" size="sm" variant="secondary">
            View
          </Button>
        </Link>
        <Link href={`/jobs/${job._id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
          <Button className="w-full rounded-lg" size="sm" variant="secondary">
            Edit
          </Button>
        </Link>
        <Link href={`/jobs/${job._id}/screenings`} className="w-full" onClick={(e) => e.stopPropagation()}>
          <Button className="w-full rounded-lg" size="sm">
            Run Screening
          </Button>
        </Link>
      </div>
    </Card>
  );
};
