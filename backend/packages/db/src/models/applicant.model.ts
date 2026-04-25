import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ParsedProfile } from '../types/index.js';

export interface IApplicant extends Document {
  job_id: mongoose.Types.ObjectId;
  source: 'umurava_platform' | 'upload_csv' | 'resume_pdf';
  parsed_profile: ParsedProfile;
  created_at: Date;
  updated_at: Date;
}

const SkillSubSchema = new Schema(
  {
    name: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], required: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const LanguageSubSchema = new Schema(
  {
    name: { type: String, required: true },
    proficiency: { type: String, enum: ['Basic', 'Conversational', 'Fluent', 'Native'], required: true },
  },
  { _id: false }
);

const WorkExperienceSubSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    description: { type: String, required: true },
    technologies: [{ type: String }],
    isCurrent: { type: Boolean, required: true },
  },
  { _id: false }
);

const EducationSubSchema = new Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String, required: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
  },
  { _id: false }
);

const CertificationSubSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: String, required: true },
  },
  { _id: false }
);

const ProjectSubSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    technologies: [{ type: String }],
    role: { type: String, required: true },
    link: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
  },
  { _id: false }
);

const AvailabilitySubSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['Available', 'Open to Opportunities', 'Not Available'],
      required: true,
    },
    type: { type: String, enum: ['Full-time', 'Part-time', 'Contract'], required: true },
    startDate: { type: String },
  },
  { _id: false }
);

const ParsedProfileSubSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    headline: { type: String, required: true },
    bio: { type: String },
    location: { type: String, required: true },
    skills: [SkillSubSchema],
    languages: [LanguageSubSchema],
    experience: [WorkExperienceSubSchema],
    education: [EducationSubSchema],
    certifications: [CertificationSubSchema],
    projects: [ProjectSubSchema],
    availability: { type: AvailabilitySubSchema, required: true },
    socialLinks: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ApplicantSchema = new Schema<IApplicant>(
  {
    job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    source: {
      type: String,
      required: true,
      enum: ['umurava_platform', 'upload_csv', 'resume_pdf'],
    },
    parsed_profile: { type: ParsedProfileSubSchema, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const ApplicantModel: Model<IApplicant> =
  mongoose.models.Applicant || mongoose.model<IApplicant>('Applicant', ApplicantSchema);
