import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  createJob,
  getJobById,
  listJobs,
  updateJob,
  deleteJob,
} from '../services/job.service.js';

const router = Router();

const CreateJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requirements: z.object({
    skills: z.array(z.string()).min(1),
    experience_years: z.number().int().min(0),
    education_level: z.string(),
    nice_to_have: z.array(z.string()).optional(),
  }),
  scoring_weights: z.object({
    skills: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    cultural_fit: z.number().min(0).max(1),
  }),
});

// POST /api/jobs - Create job
router.post('/', validate(CreateJobSchema), async (req, res) => {
  const job = await createJob(req.body);
  res.status(201).json({ data: job, error: null });
});

// GET /api/jobs - List jobs
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const offset = parseInt(req.query.offset as string, 10) || 0;

  const { jobs, total } = await listJobs(limit, offset);

  res.json({
    data: jobs,
    error: null,
    meta: { total, limit, offset },
  });
});

// GET /api/jobs/:jobId - Get job by ID
router.get('/:jobId', async (req, res) => {
  const job = await getJobById(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
      meta: {},
    });
  }

  res.json({ data: job, error: null });
});

// PATCH /api/jobs/:jobId - Update job
router.patch('/:jobId', validate(CreateJobSchema.partial()), async (req, res) => {
  const job = await updateJob(req.params.jobId, req.body);
  res.json({ data: job, error: null });
});

// DELETE /api/jobs/:jobId - Delete job
router.delete('/:jobId', async (req, res) => {
  await deleteJob(req.params.jobId);
  res.json({ data: null, error: null });
});

export { router as jobsRouter };
