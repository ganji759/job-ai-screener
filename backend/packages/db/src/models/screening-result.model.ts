import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IScreeningResult extends Document {
  screening_run_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  applicant_id: mongoose.Types.ObjectId;
  rank: number;
  composite_score: number;
  dimension_scores: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
  reasoning: {
    strengths: string[];
    gaps: string[];
    recommendation: 'Strong hire' | 'Consider' | 'Reject';
  };
  model_version: string;
  created_at: Date;
}

const ScreeningResultSchema = new Schema<IScreeningResult>(
  {
    screening_run_id: {
      type: Schema.Types.ObjectId,
      ref: 'ScreeningRun',
      required: true,
      index: true,
    },
    job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    applicant_id: {
      type: Schema.Types.ObjectId,
      ref: 'Applicant',
      required: true,
      index: true,
    },
    rank: { type: Number, required: true },
    composite_score: { type: Number, required: true, min: 0, max: 100 },
    dimension_scores: {
      skills: { type: Number, required: true, min: 0, max: 100 },
      experience: { type: Number, required: true, min: 0, max: 100 },
      education: { type: Number, required: true, min: 0, max: 100 },
      cultural_fit: { type: Number, required: true, min: 0, max: 100 },
    },
    reasoning: {
      strengths: [{ type: String }],
      gaps: [{ type: String }],
      recommendation: {
        type: String,
        required: true,
        enum: ['Strong hire', 'Consider', 'Reject'],
      },
    },
    model_version: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at' },
  }
);

// Compound index for efficient lookups by run + applicant
ScreeningResultSchema.index({ screening_run_id: 1, applicant_id: 1 });

export const ScreeningResultModel: Model<IScreeningResult> =
  mongoose.models.ScreeningResult ||
  mongoose.model<IScreeningResult>('ScreeningResult', ScreeningResultSchema);
