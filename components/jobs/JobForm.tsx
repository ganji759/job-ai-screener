"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Building2, Check, MapPin, Pencil } from "lucide-react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { TagInput } from "../ui/TagInput";
import { Select } from "../ui/Select";
import { cn } from "../../lib/utils";
import type { ExperienceLevel, Job } from "../../types";

type JobFormValues = {
  title: string;
  description: string;
  domain: string;
  location: string;
  employmentType: Job["employmentType"];
  experienceLevel: ExperienceLevel;
  minExperienceYears: number;
  education: string;
  publish: boolean;
};

export type JobSubmitValues = JobFormValues & { skills: string[] };

const PLACEHOLDER_AS_SKILL = /^type a skill and press enter$/i;

function mergeSkillDraft(tags: string[], draft: string): string[] {
  const t = draft.trim();
  if (!t || PLACEHOLDER_AS_SKILL.test(t)) return tags;
  if (tags.includes(t)) return tags;
  return [...tags, t];
}

export const JobForm = ({ onSubmit, loading }: { onSubmit: (values: JobSubmitValues) => Promise<void>; loading?: boolean }) => {
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const { register, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<JobFormValues>({
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      domain: "",
      location: "",
      employmentType: "full_time",
      experienceLevel: "mid",
      minExperienceYears: 0,
      education: "",
      publish: true,
    },
  });

  const descriptionLength = watch("description")?.length ?? 0;
  const values = watch();
  const steps = useMemo(() => ["Job Details", "Requirements", "Review & Publish"], []);

  const stepOneValid =
    (values.title?.trim().length ?? 0) >= 3 &&
    (values.title?.trim().length ?? 0) <= 100 &&
    (values.description?.trim().length ?? 0) >= 20 &&
    (values.domain?.trim().length ?? 0) >= 1 &&
    (values.location?.trim().length ?? 0) >= 1;

  const hasSkillContent = skills.length > 0 || skillsInput.trim() !== "";
  const stepTwoBasicsValid = Number.isInteger(Number(values.minExperienceYears)) && Number(values.minExperienceYears) >= 0;

  const clearSkillsErrorIfHasContent = (tags: string[], draft: string) => {
    if (tags.length > 0 || draft.trim()) setSkillsError(null);
  };

  const next = async () => {
    if (step === 0) {
      const ok = await trigger(["title", "description", "domain", "location", "employmentType"]);
      if (!ok) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      const valid = await trigger(["experienceLevel", "minExperienceYears"]);
      if (!valid) return;
      if (!hasSkillContent) {
        setSkillsError("Please add at least one required skill");
        return;
      }
      setSkillsError(null);
      const merged = mergeSkillDraft(skills, skillsInput);
      setSkills(merged);
      setSkillsInput("");
      setStep(2);
      return;
    }
  };

  const effectiveSkills = mergeSkillDraft(skills, skillsInput);

  const saveDraft = async () => {
    await onSubmit({ ...values, publish: false, skills: effectiveSkills });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit((vals) => void onSubmit({ ...vals, skills: effectiveSkills }))}>
      <div className="text-xs text-slate-500">Home / Jobs / Create Job</div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {steps.map((name, idx) => (
          <div key={name} className="flex min-w-max items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", idx < step ? "bg-brand-600 text-white" : idx === step ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500")}>
              {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
            </span>
            <span className={`text-xs font-semibold ${idx <= step ? "text-brand-700" : "text-slate-500"}`}>{name}</span>
            {idx < steps.length - 1 ? <span className={cn("mx-1 h-0.5 w-8", idx < step ? "bg-brand-600" : "bg-slate-300")} /> : null}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="step-1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Job Title</span>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className={cn("pl-9", errors.title ? "border-red-500" : "")}
                  placeholder="e.g. Senior Backend Engineer"
                  maxLength={100}
                  {...register("title", {
                    required: "Title is required",
                    minLength: { value: 3, message: "Title must be at least 3 characters" },
                    maxLength: { value: 100, message: "Title must be at most 100 characters" },
                  })}
                />
              </div>
              {errors.title?.message ? <p className="animate-fade-in-up text-xs text-red-500">{errors.title.message}</p> : null}
            </label>
            <div>
              <Textarea
                label="Job Description"
                rows={6}
                className={cn(errors.description ? "border-red-500" : "")}
                placeholder="Describe responsibilities, success metrics, must-have qualifications, and team context..."
                {...register("description", {
                  required: "Description is required",
                  minLength: { value: 20, message: "Description must be at least 20 characters" },
                })}
                error={errors.description?.message}
              />
              <p className="mt-1 text-xs text-slate-500">Be specific — the AI uses this to match candidates accurately</p>
              <p className="mt-1 text-xs text-slate-500">{descriptionLength} / 20 characters minimum</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Domain</span>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className={cn("pl-9", errors.domain ? "border-red-500" : "")} placeholder="e.g. Software Engineering" {...register("domain", { required: "Domain is required" })} />
              </div>
              {errors.domain?.message ? <p className="animate-fade-in-up text-xs text-red-500">{errors.domain.message}</p> : null}
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Location</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className={cn("pl-9", errors.location ? "border-red-500" : "")} placeholder="e.g. Kigali, Rwanda" {...register("location", { required: "Location is required" })} />
              </div>
              {errors.location?.message ? <p className="animate-fade-in-up text-xs text-red-500">{errors.location.message}</p> : null}
            </label>
            <Select
              label="Employment Type"
              options={[
                { label: "Full-time", value: "full_time" },
                { label: "Part-time", value: "part_time" },
                { label: "Contract", value: "contract" },
                { label: "Remote", value: "remote" },
              ]}
              {...register("employmentType", { required: true })}
            />
            {errors.employmentType ? <p className="text-xs text-red-500">Employment type is required</p> : null}
          </motion.div>
        ) : null}

        {step === 1 ? (
          <motion.div key="step-2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Skills</p>
              <TagInput
                showAddButton
                value={skills}
                onChange={(tags) => {
                  setSkills(tags);
                  clearSkillsErrorIfHasContent(tags, skillsInput);
                }}
                inputValue={skillsInput}
                onInputChange={(d) => {
                  setSkillsInput(d);
                  clearSkillsErrorIfHasContent(skills, d);
                }}
                error={!!skillsError}
              />
              <p className="mt-1 text-xs text-slate-500">Add at least one skill — press Enter or click Add</p>
              {skillsError ? <p className="animate-fade-in-up text-xs text-red-500">{skillsError}</p> : null}
            </div>
            <Select
              label="Experience level"
              options={[
                { label: "Junior", value: "junior" },
                { label: "Mid", value: "mid" },
                { label: "Senior", value: "senior" },
              ]}
              {...register("experienceLevel", { required: "Experience level is required" })}
            />
            {errors.experienceLevel?.message ? <p className="text-xs text-red-500">{String(errors.experienceLevel.message)}</p> : null}
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Minimum years of experience</p>
              <div className="inline-flex items-center rounded-lg border border-slate-200">
                <button type="button" className="px-3 py-2 text-lg" onClick={() => setValue("minExperienceYears", Math.max(0, Number(values.minExperienceYears || 0) - 1), { shouldValidate: true })}>-</button>
                <span className="w-16 text-center text-sm font-semibold">{Math.max(0, Number(values.minExperienceYears || 0))}</span>
                <button type="button" className="px-3 py-2 text-lg" onClick={() => setValue("minExperienceYears", Number(values.minExperienceYears || 0) + 1, { shouldValidate: true })}>+</button>
              </div>
              <input type="hidden" {...register("minExperienceYears", { valueAsNumber: true, min: { value: 0, message: "Must be zero or greater" } })} />
              {errors.minExperienceYears?.message ? <p className="animate-fade-in-up text-xs text-red-500">{errors.minExperienceYears.message}</p> : null}
            </div>
            <Input label="Education (optional)" placeholder="e.g. Bachelor's in Computer Science" {...register("education")} />
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div key="step-3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">Job Overview</h4>
                  <button type="button" onClick={() => setStep(0)} className="text-slate-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                </div>
                <p className="text-lg font-bold text-slate-900">{values.title}</p>
                <p className="mt-2 line-clamp-4 text-sm text-slate-600">{values.description}</p>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <p>{values.domain} • {values.location}</p>
                  <p>{values.employmentType.replace("_", " ")}</p>
                </div>
              </div>
              <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">Requirements Summary</h4>
                  <button type="button" onClick={() => setStep(1)} className="text-slate-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {effectiveSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-700">Level: {values.experienceLevel}</p>
                <p className="text-sm text-slate-700">Minimum experience: {values.minExperienceYears} years</p>
                {values.education?.trim() ? <p className="text-sm text-slate-700">Education: {values.education}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setValue("publish", true)}
                className={cn("rounded-xl border p-4 text-left transition", values.publish ? "border-brand-500 bg-brand-50" : "border-slate-200")}
              >
                <p className="font-semibold text-slate-900">Publish Now</p>
                <p className="text-sm text-slate-600">Job goes live immediately and is visible for screening</p>
              </button>
              <button
                type="button"
                onClick={() => setValue("publish", false)}
                className={cn("rounded-xl border p-4 text-left transition", !values.publish ? "border-brand-500 bg-brand-50" : "border-slate-200")}
              >
                <p className="font-semibold text-slate-900">Save as Draft</p>
                <p className="text-sm text-slate-600">Job is saved but not published yet</p>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Previous
        </Button>
        {step < 2 ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => void saveDraft()} disabled={step < 2 || loading}>
              Save as Draft
            </Button>
            <Button
              type="button"
              title={
                step === 0 && !stepOneValid
                  ? "Please fill all required fields"
                  : step === 1 && !stepTwoBasicsValid
                    ? "Please set experience requirements"
                    : ""
              }
              onClick={() => void next()}
              disabled={(step === 0 && !stepOneValid) || (step === 1 && !stepTwoBasicsValid)}
            >
              Next
            </Button>
          </div>
        ) : (
          <Button type="submit" loading={loading} disabled={loading} className="w-full rounded-lg">
            Create Job
          </Button>
        )}
      </div>
    </form>
  );
};
