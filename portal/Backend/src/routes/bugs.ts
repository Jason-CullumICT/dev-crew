// Verifies: FR-dependency-linking — Bug route handlers
import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { BugService } from '../services/bugService';
import { DependencyService, DependencyError } from '../services/dependencyService';
import { parseItemId } from '../../../Shared/types';
import { logger } from '../logger';

// Verifies: FR-dependency-linking — Create bug router
export function createBugRouter(db: Database.Database): Router {
  const router = Router();
  const bugService = new BugService(db);
  const depService = new DependencyService(db);

  // Verifies: FR-dependency-linking — List all bugs with has_unresolved_blockers
  router.get('/', (req: Request, res: Response) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const bugs = bugService.listBugs(query);
      res.json({ data: bugs });
    } catch (err) {
      logger.error({ err }, 'Failed to list bugs');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-linking — Get single bug with blocked_by and blocks
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const bug = bugService.getBugById(id);
      if (!bug) {
        res.status(404).json({ error: `Bug not found: ${id}` });
        return;
      }
      res.json(bug);
    } catch (err) {
      logger.error({ err, bugId: req.params.id }, 'Failed to get bug');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-dispatch-gating — Update bug with dispatch gating
  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const bug = bugService.updateBug(id, req.body);
      res.json(bug);
    } catch (err) {
      if (err instanceof DependencyError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      logger.error({ err, bugId: req.params.id }, 'Failed to update bug');
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
        depService.addDependency('bug', id, parsed.type, parsed.id);
      } else if (action === 'remove') {
        depService.removeDependency('bug', id, parsed.type, parsed.id);
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
      logger.error({ err, bugId: req.params.id }, 'Failed to modify bug dependency');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verifies: FR-dependency-ready-check — Readiness check
  router.get('/:id/ready', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const bug = bugService.getBugById(id);
      if (!bug) {
        res.status(404).json({ error: `Bug not found: ${id}` });
        return;
      }
      const readiness = depService.isReady('bug', id);
      res.json(readiness);
    } catch (err) {
      logger.error({ err, bugId: req.params.id }, 'Failed to check bug readiness');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
