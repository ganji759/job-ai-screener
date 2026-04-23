"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRoutes = void 0;
const applicants_controller_1 = require("../controllers/applicants.controller");
const jobs_controller_1 = require("../controllers/jobs.controller");
const screening_controller_1 = require("../controllers/screening.controller");
const jobsRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.get("/", jobs_controller_1.listJobs);
    app.post("/", jobs_controller_1.createJob);
    /** Nested routes expected by the Next.js frontend (`/api/v1/jobs/:jobId/…`). Register before `/:id` catch-alls. */
    app.get("/:jobId/applicants", applicants_controller_1.listApplicantsForJob);
    app.post("/:jobId/applicants", applicants_controller_1.ingestApplicantsForJob);
    app.post("/:jobId/applicants/upload", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, applicants_controller_1.uploadApplicantsForJob);
    app.post("/:jobId/screenings", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, screening_controller_1.runScreeningForJob);
    app.get("/:id/stats", jobs_controller_1.jobStats);
    app.get("/:id/benchmark", jobs_controller_1.benchmarkJob);
    app.get("/:id", jobs_controller_1.getJob);
    app.put("/:id", jobs_controller_1.updateJob);
    app.delete("/:id", jobs_controller_1.deleteJob);
};
exports.jobsRoutes = jobsRoutes;
