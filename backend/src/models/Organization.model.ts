import { Schema, model } from "mongoose";

export interface IOrganization {
  name: string;
  slug: string;
  plan: "free" | "starter" | "growth" | "enterprise";
  seats: number;
  billingStatus: "trialing" | "active" | "past_due" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan:          { type: String, enum: ["free", "starter", "growth", "enterprise"], default: "free" },
    seats:         { type: Number, default: 3 },
    billingStatus: { type: String, enum: ["trialing", "active", "past_due", "cancelled"], default: "trialing" },
  },
  { timestamps: true },
);

export const OrganizationModel = model<IOrganization>("Organization", OrganizationSchema);
