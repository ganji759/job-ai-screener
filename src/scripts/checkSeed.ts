/**
 * Verifies seeded Umurava applicants match ZodTalentProfile (official schema).
 * Run: npx tsx src/scripts/checkSeed.ts
 */
import { connectDatabase, disconnectDatabase } from "../config/database";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ZodTalentProfile } from "../utils/jsonValidator";

const EXPECTED = 20;

async function main(): Promise<void> {
  await connectDatabase();

  const job = await JobModel.findOne().sort({ createdAt: 1 }).lean();
  if (!job) {
    // eslint-disable-next-line no-console
    console.error("No job found.");
    await disconnectDatabase();
    process.exit(1);
  }

  const rows = await ApplicantModel.find({ jobId: job._id, source: "umurava_platform" }).lean();
  // eslint-disable-next-line no-console
  console.log(`Job: ${job.title} (${String(job._id)})`);
  // eslint-disable-next-line no-console
  console.log(`umurava_platform applicants: ${rows.length} (expected ${EXPECTED})`);

  let valid = 0;
  for (const r of rows) {
    const p = ZodTalentProfile.safeParse(r.profile);
    if (p.success) {
      valid += 1;
    } else {
      // eslint-disable-next-line no-console
      console.error(`Invalid profile on applicant ${String(r._id)}`, p.error.flatten());
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Valid TalentProfile schema: ${valid}/${rows.length}`);

  const ok = rows.length === EXPECTED && valid === rows.length;
  await disconnectDatabase();

  if (!ok) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log("checkSeed: OK");
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
