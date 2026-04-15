import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScreeningRun extends Document {
  job_id: mongoose.Types.ObjectId;
  status: 'pending' | 'running' | 'complete' | 'failed';
  queue_job_id?: string;
  error?: string;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ScreeningRunSchema = new Schema<IScreeningRun>(
  {
    job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'complete', 'failed'],
      default: 'pending',
    },
    queue_job_id: { type: String },
    error: { type: String },
    started_at: { type: Date, required: true },
    completed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const ScreeningRunModel: Model<IScreeningRun> =
  mongoose.models.ScreeningRun ||
  mongoose.model<IScreeningRun>('ScreeningRun', ScreeningRunSchema);
