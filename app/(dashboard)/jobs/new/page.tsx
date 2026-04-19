"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { JobForm, type JobSubmitValues } from "../../../../components/jobs/JobForm";
import { useCreateJobMutation, type CreateJobPayload } from "../../../../store/api/jobsApi";
import { Card } from "../../../../components/ui/Card";
import { getRtkQueryErrorMessage } from "../../../../lib/rtkError";

export default function NewJobPage() {
  const router = useRouter();
  const [createJob, { isLoading }] = useCreateJobMutation();

  const handleSubmit = async (values: JobSubmitValues) => {
    const skills = values.skills
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^type a skill and press enter$/i.test(s));
    if (skills.length === 0) {
      toast.error("Add at least one real skill (not the placeholder text).");
      return;
    }
    const requirements: CreateJobPayload["requirements"] = {
      domain: values.domain.trim(),
      experienceLevel: values.experienceLevel,
      minExperienceYears: values.minExperienceYears,
      skills,
    };
    if (values.education.trim()) requirements.education = values.education.trim();

    const payload: CreateJobPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.location.trim(),
      employmentType: values.employmentType,
      status: values.publish ? "active" : "draft",
      requirements,
    };

    try {
      await createJob(payload).unwrap();
      toast.success("Job created successfully!");
      router.push("/jobs");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PageHeader title="Create Job" subtitle="Define the role so AI screening can match the right profiles." />
        </div>
        <Link
          href="/jobs"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-2.5 font-semibold text-brand-800 transition hover:bg-brand-50"
        >
          Back to Jobs
        </Link>
      </div>
      <Card>
        <JobForm onSubmit={handleSubmit} loading={isLoading} />
      </Card>
    </div>
  );
}
