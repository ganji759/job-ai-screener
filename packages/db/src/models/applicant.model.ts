import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ParsedProfile } from '../types/index.js';

export interface IApplicant extends Document {
  job_id: mongoose.Types.ObjectId;
  source: 'umurava_platform' | 'upload_csv' | 'resume_pdf';
  parsed_profile: ParsedProfile;
  created_at: Date;
  updated_at: Date;
}

const ApplicantSchema = new Schema<IApplicant>(
  {
    job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    source: {
      type: String,
      required: true,
      enum: ['umurava_platform', 'upload_csv', 'resume_pdf'],
    },
    parsed_profile: {
      name: { type: String, required: true },
      skills: [{ type: String, required: true }],
      experience_years: { type: Number, required: true, min: 0 },
      education: { type: String, required: true },
      summary: { type: String, required: true, maxlength: 500 },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const ApplicantModel: Model<IApplicant> =
  mongoose.models.Applicant || mongoose.model<IApplicant>('Applicant', ApplicantSchema);
