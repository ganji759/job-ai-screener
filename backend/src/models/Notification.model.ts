import { Schema, model } from "mongoose";

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
  channel: { type: String, enum: ["in_app", "email", "system"], default: "in_app" },
  readAt: { type: Date },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = model("Notification", NotificationSchema);
