import { Schema, model, type InferSchemaType } from "mongoose";

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
export const RECRUITER_COUNTS = ["1", "2-5", "6-10", "11-25", "25+"] as const;
export const HIRING_VOLUMES = ["Under 10", "10-50", "50-200", "200+"] as const;
export const LEAD_TIERS = ["starter", "professional", "enterprise"] as const;

export type TeamSize = (typeof TEAM_SIZES)[number];
export type RecruiterCount = (typeof RECRUITER_COUNTS)[number];
export type HiringVolume = (typeof HIRING_VOLUMES)[number];
export type LeadTier = (typeof LEAD_TIERS)[number];

export interface ILead {
  full_name: string;
  work_email: string;
  company: string;
  role: string;
  team_size: TeamSize;
  recruiter_count: RecruiterCount;
  tier_of_interest: LeadTier;
  monthly_hiring_volume: HiringVolume | null;
  message: string | null;
  source: string;
  user_agent: string;
  referrer: string | null;
  ip_country: string | null;
  created_at?: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    full_name: { type: String, required: true, trim: true },
    work_email: { type: String, required: true, trim: true, lowercase: true, index: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    team_size: { type: String, enum: TEAM_SIZES, required: true },
    recruiter_count: { type: String, enum: RECRUITER_COUNTS, required: true },
    tier_of_interest: { type: String, enum: LEAD_TIERS, required: true, index: true },
    monthly_hiring_volume: { type: String, enum: HIRING_VOLUMES, default: null },
    message: { type: String, default: null },
    source: { type: String, default: "landing_pricing" },
    user_agent: { type: String, default: "" },
    referrer: { type: String, default: null },
    ip_country: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

LeadSchema.index({ created_at: -1 });

export const LeadModel = model<ILead>("Lead", LeadSchema);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;
