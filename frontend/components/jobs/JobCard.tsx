import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { Job } from "../../types";
import { CalendarDays, MapPin, Users, Building2, Trash2 } from "lucide-react";
import { useDeleteJobMutation } from "../../store/api/jobsApi";
import { getRtkQueryErrorMessage } from "../../lib/rtkError";

const empLabel = (t: Job["employmentType"]) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", remote: "Remote" })[t];

export const JobCard = ({ job }: { job: Job }) => {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();
  const statusAccent = job.status === "active" ? "border-l-emerald-500" : job.status === "draft" ? "border-l-amber-500" : "border-l-slate-400";

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      const result = await deleteJob(job._id).unwrap();
      const { applicants, screenings, interviews } = result.deleted;
      const parts = [
        applicants > 0 && `${applicants} applicant${applicants !== 1 ? "s" : ""}`,
        screenings > 0 && `${screenings} screening${screenings !== 1 ? "s" : ""}`,
        interviews > 0 && `${interviews} interview${interviews !== 1 ? "s" : ""}`,
      ].filter(Boolean);
      const detail = parts.length > 0 ? ` (+ ${parts.join(", ")})` : "";
      toast.success(`"${job.title}" deleted${detail}.`);
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  const accentColor =
    job.status === "active" ? "#34d399" : job.status === "draft" ? "#fbbf24" : "rgba(255,255,255,.16)";

  return (
    <Card
      className="lift cursor-pointer space-y-4 transition"
      style={{ borderLeft: `3px solid ${accentColor}` }}
      onMouseEnter={() => router.prefetch(`/jobs/${job._id}`)}
      onClick={() => { if (!confirmDelete) router.push(`/jobs/${job._id}`); }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !confirmDelete) {
          e.preventDefault();
          router.push(`/jobs/${job._id}`);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold" style={{ color: "#fff" }}>{job.title}</h3>
          {job.company ? <p className="text-sm" style={{ color: "var(--ink-3)" }}>{job.company}</p> : null}
        </div>
        <Badge variant={job.status === "active" ? "success" : job.status === "draft" ? "warning" : "neutral"}>{job.status}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "var(--ink-2)" }}>
        <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" style={{ color: "var(--ink-3)" }} />{job.requirements?.domain || "Department N/A"}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" style={{ color: "var(--ink-3)" }} />{job.location || "Location N/A"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="pill pill-indigo">{empLabel(job.employmentType)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--ink-3)" }}>
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{job.applicantCount ?? 0} applicants</span>
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(job.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4" onClick={(e) => e.stopPropagation()}>
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
            Screen
          </Button>
        </Link>
        {confirmDelete ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              className="flex-1 rounded-lg"
              size="sm"
              variant="danger"
              loading={deleting}
              onClick={(e) => void handleDelete(e)}
            >
              Confirm
            </Button>
            <Button
              className="rounded-lg px-2"
              size="sm"
              variant="secondary"
              disabled={deleting}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            className="w-full rounded-lg"
            size="sm"
            variant="secondary"
            onClick={(e) => void handleDelete(e)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
};
