// Verifies: FR-dependency-linking — Feature request route handlers
import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { FeatureRequestService } from '../services/featureRequestService';
import { DependencyService, DependencyError } from '../services/dependencyService';
import { parseItemId } from '../../../Shared/types';
import { logger } from '../logger';

// Verifies: FR-dependency-linking — Create feature request router
export function createFeatureRequestRouter(db: Database.Database): Router {
  const router = Router();
  const frService = new FeatureRequestService(db);
  const depService = new DependencyService(db);

  // Verifies: FR-dependency-linking — List all feature requests with has_unresolved_blockers
  router.get('/', (req: Request, res: Response) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const featureRequests = frService.listFeatureRequests(query);
      res.json({ data: featureRequests });
    } catch (err) {
      logger.error({ err }, 'Failed to list feature requests');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-linking — Get single feature request with blocked_by and blocks
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const fr = frService.getFeatureRequestById(id);
      if (!fr) {
        res.status(404).json({ error: `Feature request not found: ${id}` });
        return;
      }
      res.json(fr);
    } catch (err) {
      logger.error({ err, featureRequestId: req.params.id }, 'Failed to get feature request');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-dispatch-gating — Update feature request with dispatch gating
  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const fr = frService.updateFeatureRequest(id, req.body);
      res.json(fr);
    } catch (err) {
      if (err instanceof DependencyError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      logger.error({ err, featureRequestId: req.params.id }, 'Failed to update feature request');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-linking — Add/remove individual dependency
  router.post('/:id/dependencies', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { action, blocker_id } = req.body;
      if (!action || !blocker_id) {
        res.status(400).json({ error: 'action and blocker_id are required' });
        return;
      }

      const parsed = parseItemId(blocker_id);
      if (!parsed) {
        res.status(400).json({ error: `Invalid blocker ID format: ${blocker_id}` });
        return;
      }

      if (action === 'add') {
        depService.addDependency('feature_request', id, parsed.type, parsed.id);
      } else if (action === 'remove') {
        depService.removeDependency('feature_request', id, parsed.type, parsed.id);
      } else {
        res.status(400).json({ error: `Invalid action: ${action}. Must be 'add' or 'remove'` });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      if (err instanceof DependencyError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      logger.error({ err, featureRequestId: req.params.id }, 'Failed to modify feature request dependency');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-ready-check — Readiness check
  router.get('/:id/ready', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const fr = frService.getFeatureRequestById(id);
      if (!fr) {
        res.status(404).json({ error: `Feature request not found: ${id}` });
        return;
      }
      const readiness = depService.isReady('feature_request', id);
      res.json(readiness);
    } catch (err) {
      logger.error({ err, featureRequestId: req.params.id }, 'Failed to check feature request readiness');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
