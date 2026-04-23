"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = void 0;
const Notification_model_1 = require("../models/Notification.model");
const User_model_1 = require("../models/User.model");
const email_service_1 = require("./email.service");
const emailTemplates_service_1 = require("./emailTemplates.service");
const realtime_service_1 = require("./realtime.service");
const notifyUser = async (input) => {
    const notification = await Notification_model_1.NotificationModel.create({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "info",
        channel: "in_app",
        metadata: input.metadata,
    });
    try {
        (0, realtime_service_1.pushRealtimeEvent)(input.userId, "notification:new", {
            id: String(notification._id),
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.createdAt,
        });
    }
    catch {
        /* avoid 500 if websocket payload fails to serialize */
    }
    if (input.sendEmail) {
        // Fire-and-forget to keep API responses fast.
        void (async () => {
            const user = await User_model_1.UserModel.findById(input.userId).select("email name").lean();
            if (user?.email) {
                await (0, email_service_1.sendMailSafe)(user.email, `[Umurava AI HR] ${input.title}`, (0, emailTemplates_service_1.renderBaseEmailTemplate)({
                    title: input.title,
                    greeting: `Hello ${user.name ?? "Recruiter"},`,
                    message: input.message,
                }));
            }
        })();
    }
};
exports.notifyUser = notifyUser;
