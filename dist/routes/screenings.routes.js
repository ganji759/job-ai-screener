"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screeningsRoutes = void 0;
const screening_controller_1 = require("../controllers/screening.controller");
const screeningsRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.post("/run", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, screening_controller_1.runScreening);
    app.get("/:id", screening_controller_1.getScreening);
    app.get("/:id/explanations", screening_controller_1.screeningExplanations);
    app.get("/:id/explanations/export", screening_controller_1.exportScreeningExplanations);
    app.get("/:id/status", screening_controller_1.screeningStatus);
    app.get("/job/:jobId", screening_controller_1.screeningHistoryByJob);
    app.post("/:id/export", screening_controller_1.exportScreening);
    app.delete("/:id", screening_controller_1.deleteScreening);
    app.post("/:id/compare", screening_controller_1.compareCandidates);
};
exports.screeningsRoutes = screeningsRoutes;
