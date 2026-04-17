"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRoutes = void 0;
const jobs_controller_1 = require("../controllers/jobs.controller");
const jobsRoutes = async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.get("/", jobs_controller_1.listJobs);
    app.post("/", jobs_controller_1.createJob);
    app.get("/:id", jobs_controller_1.getJob);
    app.put("/:id", jobs_controller_1.updateJob);
    app.delete("/:id", jobs_controller_1.deleteJob);
    app.get("/:id/stats", jobs_controller_1.jobStats);
    app.get("/:id/benchmark", jobs_controller_1.benchmarkJob);
};
exports.jobsRoutes = jobsRoutes;
