/**
 * Seeds official Umurava Talent Profile documents for Scenario 1 testing.
 * Deletes ALL `umurava_platform` applicants for the first job, then inserts 20 profiles.
 */
import { randomUUID } from "node:crypto";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ZodTalentProfile } from "../utils/jsonValidator";
import { allTalentSeedProfiles } from "./talentSeedProfiles.data";

async function main(): Promise<void> {
  await connectDatabase();

  const job = await JobModel.findOne().sort({ createdAt: 1 }).lean();
  if (!job) {
    // eslint-disable-next-line no-console
    console.error("No job in database. Create a job before seeding.");
    await disconnectDatabase();
    process.exit(1);
  }

  const jobId = job._id;
  const del = await ApplicantModel.deleteMany({ jobId, source: "umurava_platform" });
  // eslint-disable-next-line no-console
  console.log(`Removed ${del.deletedCount} existing umurava_platform applicant(s) for job ${String(jobId)}.`);

  const templates = allTalentSeedProfiles();
  if (templates.length !== 20) {
    throw new Error(`Seed data must contain exactly 20 profiles; got ${templates.length}`);
  }

  const docs = templates.map((t) => {
    const profile = ZodTalentProfile.parse({
      ...t,
      id: `talent-seed-${randomUUID()}`,
    });
    return {
      jobId,
      source: "umurava_platform" as const,
      profile,
      status: "pending" as const,
    };
  });

  await ApplicantModel.insertMany(docs);

  // eslint-disable-next-line no-console
  console.log(`Inserted ${docs.length} official TalentProfile rows for job "${job.title}" (${String(jobId)}).`);
  await disconnectDatabase();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
