// Verifies: FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012
// Feature Request route handlers — thin HTTP layer, delegates to service.
// All handlers use try/catch + next(err) per DD-3.

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database/connection';
import {
  listFeatureRequests,
  createFeatureRequest,
  getFeatureRequestById,
  updateFeatureRequest,
  deleteFeatureRequest,
  voteOnFeatureRequest,
  approveFeatureRequest,
  denyFeatureRequest,
} from '../services/featureRequestService';
import { uploadImagesService, listImages, deleteImage } from '../services/imageService';
import { uploadImages as uploadMiddleware } from '../middleware/upload';
import { DependencyService, DependencyError } from '../services/dependencyService';
import { DependencyActionRequest, parseItemId } from '../../../Shared/types';
import { AppError } from '../middleware/errorHandler';
import { featureRequestTransitionsCounter, aiVotingCounter } from '../middleware/metrics';
import { withSpan } from '../lib/tracing';
import logger from '../lib/logger';

const router = Router();

// GET /api/feature-requests
// Verifies: FR-005
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.list', async (span) => {
      // Verifies: FR-DUP-05 — Read include_hidden from query param
      const { status, source, include_hidden } = req.query as { status?: string; source?: string; include_hidden?: string };
      span.setAttribute('filter.status', status || '');
      span.setAttribute('filter.source', source || '');

      const db = getDb();
      const frs = listFeatureRequests(db, { status, source, include_hidden: include_hidden === 'true' });
      logger.info('Listed feature requests', { count: frs.length, status, source });
      res.json({ data: frs });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests
// Verifies: FR-006
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.create', async (span) => {
      const { title, description, source, priority, target_repo } = req.body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        throw new AppError(400, 'title is required');
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        throw new AppError(400, 'description is required');
      }

      span.setAttribute('fr.source', source || 'manual');

      const db = getDb();
      const fr = createFeatureRequest(db, { title: title.trim(), description: description.trim(), source, priority, target_repo });
      logger.info('Created feature request', { id: fr.id, title: fr.title, duplicate_warning: fr.duplicate_warning });
      res.status(201).json(fr);
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/feature-requests/:id
// Verifies: FR-007
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.get', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      const fr = getFeatureRequestById(db, id);
      if (!fr) throw new AppError(404, `Feature request ${id} not found`);

      logger.info('Retrieved feature request', { id, vote_count: fr.votes.length });
      res.json(fr);
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/feature-requests/:id
// Verifies: FR-008
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.update', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      const existing = getFeatureRequestById(db, id);
      if (!existing) throw new AppError(404, `Feature request ${id} not found`);

      // Verifies: FR-dependency-linking — pass blocked_by through to service
      // Verifies: FR-DUP-14 — forward duplicate_of and deprecation_reason to service
      const { status, description, priority, blocked_by, duplicate_of, deprecation_reason } = req.body;
      const fromStatus = existing.status;

      const updated = updateFeatureRequest(db, id, { status, description, priority, blocked_by, duplicate_of, deprecation_reason });

      if (status && status !== fromStatus) {
        featureRequestTransitionsCounter.inc({ from_status: fromStatus, to_status: status });
        span.setAttribute('fr.status.from', fromStatus);
        span.setAttribute('fr.status.to', status);
        logger.info('Feature request status updated', { id, from: fromStatus, to: status });
      }

      res.json(updated);
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feature-requests/:id
// Verifies: FR-009
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.delete', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      deleteFeatureRequest(db, id);
      logger.info('Deleted feature request', { id });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests/:id/vote
// Verifies: FR-010
router.post('/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.vote', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      aiVotingCounter.inc();

      const db = getDb();
      const fr = voteOnFeatureRequest(db, id);

      const approveCount = fr.votes.filter((v) => v.decision === 'approve').length;
      const denyCount = fr.votes.filter((v) => v.decision === 'deny').length;

      span.setAttribute('fr.votes.approve', approveCount);
      span.setAttribute('fr.votes.deny', denyCount);
      span.setAttribute('fr.status', fr.status);

      logger.info('AI voting completed', {
        id,
        status: fr.status,
        vote_count: fr.votes.length,
        approve_count: approveCount,
        deny_count: denyCount,
        majority: approveCount > denyCount ? 'approve' : 'deny',
      });

      res.json(fr);
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests/:id/approve
// Verifies: FR-011
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.approve', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      const fr = approveFeatureRequest(db, id);

      span.setAttribute('fr.status', fr.status);
      logger.info('Feature request approved', { id, approved_at: fr.human_approval_approved_at });
      res.json(fr);
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests/:id/deny
// Verifies: FR-012
router.post('/:id/deny', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.deny', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const { comment } = req.body;
      if (!comment || typeof comment !== 'string' || comment.trim() === '') {
        throw new AppError(400, 'comment is required when denying a feature request');
      }

      const db = getDb();
      const fr = denyFeatureRequest(db, id, comment.trim());

      span.setAttribute('fr.status', fr.status);
      logger.info('Feature request denied', { id });
      res.json(fr);
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests/:id/images
// Verifies: FR-075
router.post('/:id/images', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const fr = getFeatureRequestById(db, id);
    if (!fr) {
      res.status(404).json({ error: 'Feature request not found' });
      return;
    }

    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        if (message.includes('File too large') || message.includes('LIMIT_FILE_SIZE')) {
          res.status(400).json({ error: 'File too large (max 5MB)' });
          return;
        }
        if (message.includes('Invalid file type')) {
          res.status(400).json({ error: message });
          return;
        }
        next(err);
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      const images = uploadImagesService(db, id, 'feature_request', files);
      logger.info('Images uploaded for feature request', { fr_id: id, count: images.length });
      res.status(201).json({ data: images });
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/feature-requests/:id/images
// Verifies: FR-077
router.get('/:id/images', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const fr = getFeatureRequestById(db, id);
    if (!fr) throw new AppError(404, 'Feature request not found');

    const images = listImages(db, id, 'feature_request');
    res.json({ data: images });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feature-requests/:id/images/:imageId
// Verifies: FR-077
router.delete('/:id/images/:imageId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;
    deleteImage(getDb(), imageId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/feature-requests/:id/dependencies
// Verifies: FR-dependency-linking
router.post('/:id/dependencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.dependencies', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      const fr = getFeatureRequestById(db, id);
      if (!fr) throw new AppError(404, `Feature request ${id} not found`);

      const { action, blocker_id } = req.body as DependencyActionRequest;

      if (action !== 'add' && action !== 'remove') {
        throw new AppError(400, 'action must be "add" or "remove"');
      }
      if (!blocker_id || typeof blocker_id !== 'string') {
        throw new AppError(400, 'blocker_id is required');
      }

      const parsed = parseItemId(blocker_id);
      if (!parsed) {
        throw new AppError(400, `Invalid blocker_id format: ${blocker_id}. Must be BUG-XXXX or FR-XXXX`);
      }

      const depService = new DependencyService(db);

      if (action === 'add') {
        depService.addDependency('feature_request', id, parsed.type, parsed.id);
        logger.info('Dependency added to feature request', { frId: id, blockerId: parsed.id });
      } else {
        depService.removeDependency('feature_request', id, parsed.type, parsed.id);
        logger.info('Dependency removed from feature request', { frId: id, blockerId: parsed.id });
      }

      const updated = getFeatureRequestById(db, id)!;
      res.json(updated);
    });
  } catch (err) {
    if (err instanceof DependencyError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/feature-requests/:id/ready
// Verifies: FR-dependency-ready-check
router.get('/:id/ready', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('featureRequests.ready', async (span) => {
      const { id } = req.params;
      span.setAttribute('fr.id', id);

      const db = getDb();
      const fr = getFeatureRequestById(db, id);
      if (!fr) throw new AppError(404, `Feature request ${id} not found`);

      const depService = new DependencyService(db);
      const readiness = depService.isReady('feature_request', id);
      logger.info('Feature request readiness checked', { frId: id, ready: readiness.ready });
      res.json(readiness);
    });
  } catch (err) {
    next(err);
  }
});

export default router;
