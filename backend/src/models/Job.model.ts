import { Schema, model } from "mongoose";

const JobRequirementsSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  mustHaveSkills: [{ type: String }],
  niceToHaveSkills: [{ type: String }],
  minYearsExperience: { type: Number, default: 0 },
  educationLevel: { type: String, enum: ["none", "certificate", "bachelor", "master", "phd"], default: "none" },
  domain: { type: String, default: "general" },
  location: { type: String },
  remoteAllowed: { type: Boolean, default: false },
  salaryRange: { min: Number, max: Number, currency: String },
  softSkills: [{ type: String }],
}, { _id: false });

const JobSchema = new Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  description: { type: String, required: true },
  requirements: { type: JobRequirementsSchema, required: true },
  recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["draft", "active", "closed"], default: "active" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

JobSchema.virtual("applicantCount", {
  ref: "Applicant",
  localField: "_id",
  foreignField: "jobId",
  count: true,
});

JobSchema.index({ recruiterId: 1, status: 1 });
export const JobModel = model("Job", JobSchema);
