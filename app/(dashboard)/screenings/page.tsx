"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";

export default function ScreeningsHomePage() {
  const { data } = useGetJobsQuery({ page: 1, limit: 20, status: "active" });
  return (
    <div className="space-y-6">
      <PageHeader title="Screenings" subtitle="Select a job to run or view screening results." />
      <div className="grid gap-4 md:grid-cols-2">
        {data?.jobs.map((job) => (
          <Card key={job._id} className="flex flex-col">
            <h3 className="font-semibold text-slate-900">{job.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.description}</p>
            <Link
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
              href={`/jobs/${job._id}/screenings`}
            >
              Open screenings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
