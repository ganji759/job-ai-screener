import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { createApplicants, getApplicantsByJob, uploadResumes } from '../services/applicant.service.js';

const router: ExpressRouter = Router({ mergeParams: true });

const ParsedProfileSchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
  experience_years: z.number().int().min(0),
  education: z.string(),
  summary: z.string().max(500),
});

const CreateApplicantsSchema = z.object({
  profiles: z.array(ParsedProfileSchema),
});

// POST / - Create applicants from structured profiles
router.post('/', validate(CreateApplicantsSchema), async (req, res) => {
  const jobId = req.params['jobId'] as string;
  const applicants = await createApplicants({
    jobId,
    profiles: req.body.profiles,
  });
  res.status(201).json({ data: applicants, error: null });
});

// POST /upload - Upload CSV/PDF resumes
router.post('/upload', upload.array('files', 50), async (req, res) => {
  const jobId = req.params['jobId'] as string;
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({
      data: null,
      error: { code: 'NO_FILES', message: 'No files uploaded' },
      meta: {},
    });
  }

  const applicants = await uploadResumes(
    jobId,
    files.map((f) => ({ buffer: f.buffer, originalname: f.originalname }))
  );

  res.status(201).json({ data: applicants, error: null });
});

// GET / - List applicants for job
router.get('/', async (req, res) => {
  const jobId = (req.params as Record<string, string>)['jobId'] ?? '';
  const limit = parseInt(req.query['limit'] as string, 10) || 100;
  const offset = parseInt(req.query['offset'] as string, 10) || 0;

  const { applicants, total } = await getApplicantsByJob(jobId, limit, offset);

  res.json({
    data: applicants,
    error: null,
    meta: { total, limit, offset },
  });
});

export { router as applicantsRouter };
