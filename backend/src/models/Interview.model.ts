import { Schema, model } from "mongoose";

const SlotSchema = new Schema(
  { start: { type: Date, required: true }, end: { type: Date, required: true } },
  { _id: false },
);

const InterviewSchema = new Schema(
  {
    candidateId:    { type: String, required: true },
    applicantId:    { type: Schema.Types.ObjectId, ref: "Applicant", required: true },
    jobId:          { type: Schema.Types.ObjectId, ref: "Job", required: true },
    screeningId:    { type: Schema.Types.ObjectId, ref: "Screening", required: false },
    recruiterId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    candidateName:  { type: String, required: true },
    candidateEmail: { type: String, required: true },
    jobTitle:       { type: String, required: true },
    title:          { type: String, required: true },
    type:           { type: String, enum: ["video", "phone", "in-person"], required: true },
    status:         { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
    proposedSlots:  { type: [SlotSchema], default: [] },
    confirmedSlot:  { type: SlotSchema },
    meetingLink:          { type: String },
    notes:                { type: String },
    googleCalendarEventId:{ type: String },
  },
  { timestamps: true },
);

InterviewSchema.index({ recruiterId: 1, createdAt: -1 });
InterviewSchema.index({ screeningId: 1 });
InterviewSchema.index({ applicantId: 1 });

export const InterviewModel = model("Interview", InterviewSchema);
