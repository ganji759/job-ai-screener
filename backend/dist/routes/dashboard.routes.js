"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const dashboardRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.get("/dashboard/analytics", dashboard_controller_1.dashboardAnalytics);
    app.post("/candidates/:id/feedback", dashboard_controller_1.candidateFeedback);
};
exports.dashboardRoutes = dashboardRoutes;
