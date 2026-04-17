import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { createApplicants, getApplicantsByJob, uploadResumes } from '../services/applicant.service.js';
import { ParsedProfileSchema } from '@umurava/ai';

const router = Router();

const CreateApplicantsSchema = z.object({
  profiles: z.array(ParsedProfileSchema),
});

// POST / - Create applicants from structured profiles
router.post('/', validate(CreateApplicantsSchema), async (req, res) => {
  const applicants = await createApplicants({
    jobId: req.params.jobId,
    profiles: req.body.profiles,
  });
  res.status(201).json({ data: applicants, error: null });
});

// POST /upload - Upload CSV/PDF resumes
router.post('/upload', upload.array('files', 50), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({
      data: null,
      error: { code: 'NO_FILES', message: 'No files uploaded' },
      meta: {},
    });
  }

  const applicants = await uploadResumes(
    req.params.jobId,
    files.map((f) => ({ buffer: f.buffer, originalname: f.originalname }))
  );

  res.status(201).json({ data: applicants, error: null });
});

// GET / - List applicants for job
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const offset = parseInt(req.query.offset as string, 10) || 0;

  const { applicants, total } = await getApplicantsByJob(
    req.params.jobId,
    limit,
    offset
  );

  res.json({
    data: applicants,
    error: null,
    meta: { total, limit, offset },
  });
});

export { router as applicantsRouter };
