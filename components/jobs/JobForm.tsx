"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { TagInput } from "../ui/TagInput";
import { Select } from "../ui/Select";

type JobFormValues = {
  title: string;
  description: string;
  domain: string;
  location: string;
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
  employmentType: "full_time" | "part_time" | "contract";
  minYearsExperience: number;
  educationLevel: "none" | "certificate" | "bachelor" | "master" | "phd";
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  publish: boolean;
};
export type JobSubmitValues = JobFormValues & { mustHaveSkills: string[]; niceToHaveSkills: string[] };

export const JobForm = ({ onSubmit, loading }: { onSubmit: (values: JobSubmitValues) => Promise<void>; loading?: boolean }) => {
  const [step, setStep] = useState(0);
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<JobFormValues>({
    defaultValues: {
      remotePreference: "remote",
      employmentType: "full_time",
      minYearsExperience: 0,
      educationLevel: "none",
      salaryMin: 0,
      salaryMax: 0,
      salaryCurrency: "USD",
      publish: true,
    },
  });
  const descriptionLength = watch("description")?.length ?? 0;
  const values = watch();
  const steps = useMemo(() => ["Job Details", "Requirements", "Review & Publish"], []);

  const canGoNext = async () => {
    if (step === 0) return trigger(["title", "description", "domain", "location", "remotePreference", "employmentType"]);
    if (step === 1) return trigger(["minYearsExperience", "educationLevel", "salaryMin", "salaryMax", "salaryCurrency"]);
    return true;
  };

  const next = async () => {
    const ok = await canGoNext();
    if (!ok) return;
    setStep((s) => Math.min(2, s + 1));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit((vals) => void onSubmit({ ...vals, mustHaveSkills, niceToHaveSkills }))}>
      <div className="flex items-center gap-2">
        {steps.map((name, idx) => (
          <div key={name} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx <= step ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"}`}>{idx + 1}</span>
            <span className={`text-xs font-semibold ${idx <= step ? "text-brand-700" : "text-slate-500"}`}>{name}</span>
            {idx < steps.length - 1 ? <span className="mx-1 h-px w-6 bg-slate-300" /> : null}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4 animate-fade-in-up">
          <Input label="Job Title" {...register("title")} error={errors.title?.message} />
          <Textarea label="Job Description" rows={6} {...register("description")} error={errors.description?.message} />
          <p className="text-xs text-slate-500">{descriptionLength} / 100 characters minimum</p>
          <Input label="Domain" {...register("domain")} error={errors.domain?.message} />
          <Input label="Location" {...register("location")} error={errors.location?.message} />
          <Select
            label="Remote Preference"
            options={[
              { label: "Remote", value: "remote" },
              { label: "Hybrid", value: "hybrid" },
              { label: "Onsite", value: "onsite" },
              { label: "Flexible", value: "flexible" },
            ]}
            {...register("remotePreference")}
          />
          <Select
            label="Employment Type"
            options={[
              { label: "Full-time", value: "full_time" },
              { label: "Part-time", value: "part_time" },
              { label: "Contract", value: "contract" },
            ]}
            {...register("employmentType")}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Must-have Skills</p>
            <TagInput value={mustHaveSkills} onChange={setMustHaveSkills} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Nice-to-have Skills</p>
            <TagInput value={niceToHaveSkills} onChange={setNiceToHaveSkills} />
          </div>
          <Input label="Minimum Years Experience" type="number" {...register("minYearsExperience")} error={errors.minYearsExperience?.message} />
          <Select
            label="Education Level"
            options={[
              { label: "None", value: "none" },
              { label: "Certificate", value: "certificate" },
              { label: "Bachelor", value: "bachelor" },
              { label: "Master", value: "master" },
              { label: "PhD", value: "phd" },
            ]}
            {...register("educationLevel")}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Salary Min" type="number" {...register("salaryMin")} />
            <Input label="Salary Max" type="number" {...register("salaryMax")} />
            <Input label="Currency" {...register("salaryCurrency")} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3 animate-fade-in-up rounded-xl border border-brand-100 bg-brand-50/30 p-4 text-sm">
          <p><b>Title:</b> {values.title}</p>
          <p><b>Domain:</b> {values.domain}</p>
          <p><b>Location:</b> {values.location}</p>
          <p><b>Remote Preference:</b> {values.remotePreference}</p>
          <p><b>Employment Type:</b> {values.employmentType}</p>
          <p><b>Must-have skills:</b> {mustHaveSkills.join(", ") || "None"}</p>
          <p><b>Nice-to-have skills:</b> {niceToHaveSkills.join(", ") || "None"}</p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("publish")} />
            Publish immediately (unchecked = draft)
          </label>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Previous
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={() => void next()}>
            Next
          </Button>
        ) : (
          <Button type="submit" loading={loading}>
            Create Job
          </Button>
        )}
      </div>
    </form>
  );
};
