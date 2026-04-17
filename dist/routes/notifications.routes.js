"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRoutes = void 0;
const notifications_controller_1 = require("../controllers/notifications.controller");
const notificationsRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.get("/", notifications_controller_1.listNotifications);
    app.patch("/:id/read", notifications_controller_1.markNotificationRead);
    app.patch("/read-all", notifications_controller_1.markAllRead);
    app.delete("/:id", notifications_controller_1.deleteNotification);
    app.post("/broadcast", notifications_controller_1.notifyBroadcast);
};
exports.notificationsRoutes = notificationsRoutes;
