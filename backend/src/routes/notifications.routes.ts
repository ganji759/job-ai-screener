import type { FastifyPluginAsync } from "fastify";
import { deleteNotification, listNotifications, markAllRead, markNotificationRead, notifyBroadcast } from "../controllers/notifications.controller";

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.get("/", listNotifications);
  app.patch("/:id/read", markNotificationRead);
  app.patch("/read-all", markAllRead);
  app.delete("/:id", deleteNotification);
  app.post("/broadcast", notifyBroadcast);
};
