import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { NotificationModel } from "../models/Notification.model";

export const listNotifications = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { page = "1", limit = "20" } = request.query as Record<string, string>;
  const p = Number(page);
  const l = Number(limit);
  const userId = request.user?.userId;
  const [items, total] = await Promise.all([
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    NotificationModel.countDocuments({ userId }),
  ]);
  reply.send({ notifications: items, total, page: p, totalPages: Math.ceil(total / l) });
};

export const markNotificationRead = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const userId = request.user?.userId;
  const updated = await NotificationModel.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true }).lean();
  if (!updated) return void reply.code(404).send({ error: "Notification not found" });
  reply.send({ success: true, notification: updated });
};

export const markAllRead = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = request.user?.userId;
  await NotificationModel.updateMany({ userId, readAt: { $exists: false } }, { readAt: new Date() });
  reply.send({ success: true });
};

export const deleteNotification = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const userId = request.user?.userId;
  const deleted = await NotificationModel.findOneAndDelete({ _id: id, userId }).lean();
  if (!deleted) return void reply.code(404).send({ error: "Notification not found" });
  reply.send({ success: true });
};

export const notifyBroadcast = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = z.object({ title: z.string().min(3), message: z.string().min(3) }).strip().parse(request.body);
  reply.send({ accepted: true, payload: body, note: "Broadcast hook ready (admin workflow)." });
};
