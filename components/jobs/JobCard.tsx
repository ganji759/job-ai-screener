import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { Job } from "../../types";
import { useMemo } from "react";

export const JobCard = ({ job }: { job: Job }) => {
  const router = useRouter();
  const skillsPreview = useMemo(() => job.requirements.mustHaveSkills.slice(0, 3), [job.requirements.mustHaveSkills]);
  return (
    <Card className="space-y-3 border-l-4 border-l-brand-500" onMouseEnter={() => router.prefetch(`/jobs/${job._id}`)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{job.title}</h3>
        <Badge variant={job.status === "active" ? "success" : job.status === "draft" ? "warning" : "neutral"}>{job.status}</Badge>
      </div>
      <p className="line-clamp-2 text-sm text-slate-600">{job.description}</p>
      <p className="text-xs text-slate-500">Skills: {skillsPreview.join(", ")}{job.requirements.mustHaveSkills.length > 3 ? ` +${job.requirements.mustHaveSkills.length - 3}` : ""}</p>
      <p className="text-xs text-slate-500">Applicants: {job.applicantCount ?? 0}</p>
      <div className="flex gap-2">
        <Link href={`/jobs/${job._id}`} className="flex-1"><Button className="w-full" size="sm">View</Button></Link>
        <Link href={`/jobs/${job._id}/screenings`} className="flex-1"><Button className="w-full" size="sm" variant="secondary">Run Screening</Button></Link>
      </div>
    </Card>
  );
};
