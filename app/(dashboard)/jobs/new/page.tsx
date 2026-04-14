"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { JobForm, type JobSubmitValues } from "../../../../components/jobs/JobForm";
import { useCreateJobMutation } from "../../../../store/api/jobsApi";
import { Card } from "../../../../components/ui/Card";

export default function NewJobPage() {
  const router = useRouter();
  const [createJob, { isLoading }] = useCreateJobMutation();

  const handleSubmit = async (values: JobSubmitValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        status: (values.publish ? "active" : "draft") as "active" | "draft",
        requirements: {
          title: values.title,
          description: values.description,
          mustHaveSkills: values.mustHaveSkills,
          niceToHaveSkills: values.niceToHaveSkills,
          minYearsExperience: values.minYearsExperience,
          educationLevel: values.educationLevel,
          domain: values.domain,
          location: values.location,
          remoteAllowed: values.remotePreference !== "onsite",
          salaryRange: {
            min: values.salaryMin,
            max: values.salaryMax,
            currency: values.salaryCurrency,
          },
          softSkills: [],
        },
      };
      const created = await createJob(payload).unwrap();
      toast.success("Job created successfully.");
      router.push(`/jobs/${created._id}`);
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Failed to create job.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Create Job" subtitle="Define the role so AI screening can match the right profiles." />
      <Card>
        <JobForm onSubmit={handleSubmit} loading={isLoading} />
      </Card>
    </div>
  );
}
