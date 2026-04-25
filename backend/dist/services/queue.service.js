"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobStatus = exports.addScreeningJob = exports.screeningQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const env_1 = require("../config/env");
exports.screeningQueue = env_1.env.REDIS_ENABLED
    ? new bull_1.default("screening-jobs", env_1.env.REDIS_URL)
    : null;
const addScreeningJob = async (data) => {
    if (!exports.screeningQueue) {
        throw new Error("Redis queue is disabled. Set REDIS_ENABLED=true to run async screenings.");
    }
    return exports.screeningQueue.add(data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
};
exports.addScreeningJob = addScreeningJob;
const getJobStatus = async (jobId) => {
    if (!exports.screeningQueue) {
        return { state: "redis_disabled", progress: 0 };
    }
    const job = await exports.screeningQueue.getJob(jobId);
    if (!job)
        return { state: "not_found" };
    const state = await job.getState();
    return { state, progress: job.progress() };
};
exports.getJobStatus = getJobStatus;
