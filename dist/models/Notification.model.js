"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    channel: { type: String, enum: ["in_app", "email", "system"], default: "in_app" },
    readAt: { type: Date },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
NotificationSchema.index({ userId: 1, createdAt: -1 });
exports.NotificationModel = (0, mongoose_1.model)("Notification", NotificationSchema);
