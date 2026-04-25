import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { createApplicants, getApplicantsByJob, uploadResumes } from '../services/applicant.service.js';

const router: ExpressRouter = Router({ mergeParams: true });

const SkillSchema = z.object({
  name: z.string(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  yearsOfExperience: z.number().int().min(0),
});

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: z.enum(['Basic', 'Conversational', 'Fluent', 'Native']),
});

const WorkExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  isCurrent: z.boolean(),
});

const EducationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string(),
});

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  role: z.string(),
  link: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

const AvailabilitySchema = z.object({
  status: z.enum(['Available', 'Open to Opportunities', 'Not Available']),
  type: z.enum(['Full-time', 'Part-time', 'Contract']),
  startDate: z.string().optional(),
});

const ParsedProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  headline: z.string(),
  bio: z.string().optional(),
  location: z.string(),
  skills: z.array(SkillSchema),
  languages: z.array(LanguageSchema).default([]),
  experience: z.array(WorkExperienceSchema),
  education: z.array(EducationEntrySchema),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema),
  availability: AvailabilitySchema,
  socialLinks: z
    .object({ linkedin: z.string().optional(), github: z.string().optional(), portfolio: z.string().optional() })
    .catchall(z.string().optional())
    .optional(),
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
