import { Router } from 'express';
import { startScreening, getScreeningStatus, getScreeningResults } from '../services/screening.service.js';

const jobScreeningsRouter = Router({ mergeParams: true });
const screeningsRouter = Router();

function isNotCompleteError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (error as { code?: unknown }).code === 'SCREENING_NOT_COMPLETE';
}

// POST /api/jobs/:jobId/screenings - Trigger new screening run
jobScreeningsRouter.post('/', async (req, res) => {
  const screening = await startScreening({ jobId: req.params.jobId });
  res.status(201).json({ data: screening, error: null });
});

// GET /api/screenings/:runId/status - Poll screening status
screeningsRouter.get('/:runId/status', async (req, res) => {
  const status = await getScreeningStatus(req.params.runId);

  if (!status) {
    return res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Screening run not found' },
      meta: {},
    });
  }

  res.json({ data: status, error: null });
});

// GET /api/screenings/:runId/results - Get ranked results
screeningsRouter.get('/:runId/results', async (req, res) => {
  try {
    const results = await getScreeningResults(req.params.runId);

    if (!results) {
      return res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Screening run not found' },
        meta: {},
      });
    }

    res.json({ data: results, error: null });
  } catch (error) {
    if (isNotCompleteError(error)) {
      return res.status(400).json({
        data: null,
        error: { code: 'NOT_COMPLETE', message: 'Screening is not yet complete' },
        meta: {},
      });
    }
    throw error;
  }
});

// GET /api/screenings/:runId/results/:applicantId - Get single candidate reasoning
screeningsRouter.get('/:runId/results/:applicantId', async (req, res) => {
  let results;
  try {
    results = await getScreeningResults(req.params.runId);
  } catch (error) {
    if (isNotCompleteError(error)) {
      return res.status(400).json({
        data: null,
        error: { code: 'NOT_COMPLETE', message: 'Screening is not yet complete' },
        meta: {},
      });
    }
    throw error;
  }

  if (!results) {
    return res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Screening run not found' },
      meta: {},
    });
  }

  const candidate = results.ranked.find(
    (r) => r.applicant._id.toString() === req.params.applicantId
  );

  if (!candidate) {
    return res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Applicant not found in results' },
      meta: {},
    });
  }

  res.json({
    data: {
      rank: candidate.rank,
      composite_score: candidate.composite_score,
      dimension_scores: candidate.dimension_scores,
      strengths: candidate.strengths,
      gaps: candidate.gaps,
      recommendation: candidate.recommendation,
    },
    error: null,
  });
});

export { screeningsRouter, jobScreeningsRouter };
