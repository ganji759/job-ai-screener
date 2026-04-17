import { Applicant, ApplicantModel, JobModel } from '@umurava/db';
import { AppError } from '../lib/errors.js';
import { parsePDF, parseCSV } from './ingestion.service.js';

interface CreateApplicantInput {
  jobId: string;
  profiles: ParsedProfile[];
}

export async function createApplicants(input: CreateApplicantInput): Promise<Applicant[]> {
  const job = await JobModel.findOne({ _id: input.jobId, is_deleted: false });
  if (!job) {
    throw new AppError('JOB_NOT_FOUND', `Job ${input.jobId} not found`);
  }

  const applicants = input.profiles.map((profile) => ({
    job_id: input.jobId,
    parsed_profile: profile,
    source: 'umurava_platform' as const,
  }));

  const created = await ApplicantModel.insertMany(applicants);
  return created;
}

export async function getApplicantsByJob(
  jobId: string,
  limit = 100,
  offset = 0
): Promise<{ applicants: Applicant[]; total: number }> {
  const total = await ApplicantModel.countDocuments({ job_id: jobId });
  const applicants = await ApplicantModel.find({ job_id: jobId })
    .limit(limit)
    .skip(offset)
    .lean();
  return { applicants, total };
}

export async function uploadResumes(
  jobId: string,
  files: { buffer: Buffer; originalname: string }[]
): Promise<Applicant[]> {
  const job = await JobModel.findOne({ _id: jobId, is_deleted: false });
  if (!job) {
    throw new AppError('JOB_NOT_FOUND', `Job ${jobId} not found`);
  }

  const parsed = await Promise.all(
    files.map(async (file) => {
      const ext = file.originalname.toLowerCase().match(/\.[a-z]+$/)?.[0];
      if (ext === '.pdf') {
        const profile = await parsePDF(file.buffer);
        return [{ parsed_profile: profile, source: 'resume_pdf' as const }];
      }
      if (ext === '.csv') {
        const csvProfiles = await parseCSV(file.buffer);
        return csvProfiles.map((parsed_profile) => ({
          parsed_profile,
          source: 'upload_csv' as const,
        }));
      }
      return [];
    })
  );

  const applicants = parsed.flat().map((item) => ({
    job_id: jobId,
    parsed_profile: item.parsed_profile,
    source: item.source,
  }));

  const created = await ApplicantModel.insertMany(applicants);
  return created;
}
