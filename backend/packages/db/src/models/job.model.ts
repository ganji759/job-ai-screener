import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience_years: number;
    education_level: string;
    nice_to_have?: string[];
  };
  scoring_weights: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: {
      skills: [{ type: String, required: true }],
      experience_years: { type: Number, required: true, min: 0 },
      education_level: { type: String, required: true },
      nice_to_have: [{ type: String }],
    },
    scoring_weights: {
      skills: { type: Number, required: true, min: 0, max: 1 },
      experience: { type: Number, required: true, min: 0, max: 1 },
      education: { type: Number, required: true, min: 0, max: 1 },
      cultural_fit: { type: Number, required: true, min: 0, max: 1 },
    },
    is_deleted: { type: Boolean, required: true, default: false, index: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const JobModel: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
