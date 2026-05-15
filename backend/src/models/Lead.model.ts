import { Schema, model, type InferSchemaType } from "mongoose";

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
export const LEAD_TIERS = ["starter", "professional", "enterprise"] as const;

export type TeamSize = (typeof TEAM_SIZES)[number];
export type LeadTier = (typeof LEAD_TIERS)[number];

export interface ILead {
  full_name: string;
  work_email: string;
  company: string;
  role: string;
  team_size: TeamSize;
  tier_of_interest: LeadTier;
  message: string | null;
  source: string;
  user_agent: string;
  referrer: string | null;
  created_at?: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    full_name: { type: String, required: true, trim: true },
    work_email: { type: String, required: true, trim: true, lowercase: true, index: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    team_size: { type: String, enum: TEAM_SIZES, required: true },
    tier_of_interest: { type: String, enum: LEAD_TIERS, required: true, index: true },
    message: { type: String, default: null },
    source: { type: String, default: "landing_page" },
    user_agent: { type: String, default: "" },
    referrer: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

LeadSchema.index({ created_at: -1 });

export const LeadModel = model<ILead>("Lead", LeadSchema);

// Silence unused-import warning for environments that need the inferred type elsewhere.
export type LeadDoc = InferSchemaType<typeof LeadSchema>;
