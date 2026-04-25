"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Verifies seeded Umurava applicants match ZodTalentProfile (official schema).
 * Run: npx tsx src/scripts/checkSeed.ts
 */
const database_1 = require("../config/database");
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const jsonValidator_1 = require("../utils/jsonValidator");
const EXPECTED = 20;
async function main() {
    await (0, database_1.connectDatabase)();
    const job = await Job_model_1.JobModel.findOne().sort({ createdAt: 1 }).lean();
    if (!job) {
        // eslint-disable-next-line no-console
        console.error("No job found.");
        await (0, database_1.disconnectDatabase)();
        process.exit(1);
    }
    const rows = await Applicant_model_1.ApplicantModel.find({ jobId: job._id, source: "umurava_platform" }).lean();
    // eslint-disable-next-line no-console
    console.log(`Job: ${job.title} (${String(job._id)})`);
    // eslint-disable-next-line no-console
    console.log(`umurava_platform applicants: ${rows.length} (expected ${EXPECTED})`);
    let valid = 0;
    for (const r of rows) {
        const p = jsonValidator_1.ZodTalentProfile.safeParse(r.profile);
        if (p.success) {
            valid += 1;
        }
        else {
            // eslint-disable-next-line no-console
            console.error(`Invalid profile on applicant ${String(r._id)}`, p.error.flatten());
        }
    }
    // eslint-disable-next-line no-console
    console.log(`Valid TalentProfile schema: ${valid}/${rows.length}`);
    const ok = rows.length === EXPECTED && valid === rows.length;
    await (0, database_1.disconnectDatabase)();
    if (!ok) {
        process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log("checkSeed: OK");
}
main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await (0, database_1.disconnectDatabase)();
    process.exit(1);
});
