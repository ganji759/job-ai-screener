"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicantsRoutes = void 0;
const applicants_controller_1 = require("../controllers/applicants.controller");
const applicantsRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.post("/screen/platform", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, applicants_controller_1.screenPlatformApplicants);
    app.post("/screen/external", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, applicants_controller_1.screenExternalApplicants);
    app.post("/ingest", applicants_controller_1.ingestApplicants);
    app.post("/external-ingest", applicants_controller_1.externalIngestApplicants);
    app.post("/upload", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, applicants_controller_1.uploadApplicants);
    app.get("/", applicants_controller_1.listApplicants);
    app.delete("/:id", applicants_controller_1.deleteApplicant);
    app.post("/bulk-delete", applicants_controller_1.bulkDeleteApplicants);
    app.post("/:id/enhance", applicants_controller_1.enhanceApplicant);
};
exports.applicantsRoutes = applicantsRoutes;
