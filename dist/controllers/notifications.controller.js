"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyBroadcast = exports.deleteNotification = exports.markAllRead = exports.markNotificationRead = exports.listNotifications = void 0;
const zod_1 = require("zod");
const Notification_model_1 = require("../models/Notification.model");
const listNotifications = async (request, reply) => {
    const { page = "1", limit = "20" } = request.query;
    const p = Number(page);
    const l = Number(limit);
    const userId = request.user?.userId;
    const [items, total] = await Promise.all([
        Notification_model_1.NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        Notification_model_1.NotificationModel.countDocuments({ userId }),
    ]);
    reply.send({ notifications: items, total, page: p, totalPages: Math.ceil(total / l) });
};
exports.listNotifications = listNotifications;
const markNotificationRead = async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.userId;
    const updated = await Notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true }).lean();
    if (!updated)
        return void reply.code(404).send({ error: "Notification not found" });
    reply.send({ success: true, notification: updated });
};
exports.markNotificationRead = markNotificationRead;
const markAllRead = async (request, reply) => {
    const userId = request.user?.userId;
    await Notification_model_1.NotificationModel.updateMany({ userId, readAt: { $exists: false } }, { readAt: new Date() });
    reply.send({ success: true });
};
exports.markAllRead = markAllRead;
const deleteNotification = async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.userId;
    const deleted = await Notification_model_1.NotificationModel.findOneAndDelete({ _id: id, userId }).lean();
    if (!deleted)
        return void reply.code(404).send({ error: "Notification not found" });
    reply.send({ success: true });
};
exports.deleteNotification = deleteNotification;
const notifyBroadcast = async (request, reply) => {
    const body = zod_1.z.object({ title: zod_1.z.string().min(3), message: zod_1.z.string().min(3) }).strip().parse(request.body);
    reply.send({ accepted: true, payload: body, note: "Broadcast hook ready (admin workflow)." });
};
exports.notifyBroadcast = notifyBroadcast;
