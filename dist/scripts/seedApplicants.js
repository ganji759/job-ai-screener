"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seeds official Umurava Talent Profile documents for Scenario 1 testing.
 * Deletes ALL `umurava_platform` applicants for the first job, then inserts 20 profiles.
 */
const node_crypto_1 = require("node:crypto");
const database_1 = require("../config/database");
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const jsonValidator_1 = require("../utils/jsonValidator");
const talentSeedProfiles_data_1 = require("./talentSeedProfiles.data");
async function main() {
    await (0, database_1.connectDatabase)();
    const job = await Job_model_1.JobModel.findOne().sort({ createdAt: 1 }).lean();
    if (!job) {
        // eslint-disable-next-line no-console
        console.error("No job in database. Create a job before seeding.");
        await (0, database_1.disconnectDatabase)();
        process.exit(1);
    }
    const jobId = job._id;
    const del = await Applicant_model_1.ApplicantModel.deleteMany({ jobId, source: "umurava_platform" });
    // eslint-disable-next-line no-console
    console.log(`Removed ${del.deletedCount} existing umurava_platform applicant(s) for job ${String(jobId)}.`);
    const templates = (0, talentSeedProfiles_data_1.allTalentSeedProfiles)();
    if (templates.length !== 20) {
        throw new Error(`Seed data must contain exactly 20 profiles; got ${templates.length}`);
    }
    const docs = templates.map((t) => {
        const profile = jsonValidator_1.ZodTalentProfile.parse({
            ...t,
            id: `talent-seed-${(0, node_crypto_1.randomUUID)()}`,
        });
        return {
            jobId,
            source: "umurava_platform",
            profile,
            status: "pending",
        };
    });
    await Applicant_model_1.ApplicantModel.insertMany(docs);
    // eslint-disable-next-line no-console
    console.log(`Inserted ${docs.length} official TalentProfile rows for job "${job.title}" (${String(jobId)}).`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await (0, database_1.disconnectDatabase)();
    process.exit(1);
});
