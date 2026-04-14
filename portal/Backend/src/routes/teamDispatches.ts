// Team dispatch history route handlers.
// Records each support-team dispatch and returns the history for display
// in the portal TeamsPage.

import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database/connection';
import { withSpan } from '../lib/tracing';
import logger from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

const router = Router();

interface TeamDispatch {
  id: string
  team: string
  inputs: string
  dispatched_at: string
  actions_url: string
  workflow: string
  repo: string
}

// GET /api/team-dispatches?team=TheInspector&limit=20
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('teamDispatches.list', async (span) => {
      const { team, limit = '50' } = req.query as { team?: string; limit?: string };
      const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

      span.setAttribute('filter.team', team || 'all');
      span.setAttribute('filter.limit', limitNum);

      const db = getDb();
      let rows: TeamDispatch[];
      if (team) {
        rows = db.prepare(
          `SELECT * FROM team_dispatches WHERE team = ? ORDER BY dispatched_at DESC LIMIT ?`
        ).all(team, limitNum) as TeamDispatch[];
      } else {
        rows = db.prepare(
          `SELECT * FROM team_dispatches ORDER BY dispatched_at DESC LIMIT ?`
        ).all(limitNum) as TeamDispatch[];
      }

      logger.info('Listed team dispatches', { count: rows.length, team: team || 'all' });
      res.json({ data: rows.map((r) => ({ ...r, inputs: JSON.parse(r.inputs) })) });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/team-dispatches
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('teamDispatches.create', async (span) => {
      const { team, inputs, actions_url, workflow, repo } = req.body;

      if (!team || typeof team !== 'string') throw new AppError(400, 'team is required');
      if (!actions_url || typeof actions_url !== 'string') throw new AppError(400, 'actions_url is required');
      if (!workflow || typeof workflow !== 'string') throw new AppError(400, 'workflow is required');
      if (!repo || typeof repo !== 'string') throw new AppError(400, 'repo is required');

      span.setAttribute('dispatch.team', team);

      const id = randomUUID();
      const dispatched_at = new Date().toISOString();
      const inputs_json = JSON.stringify(inputs || {});

      const db = getDb();
      db.prepare(
        `INSERT INTO team_dispatches (id, team, inputs, dispatched_at, actions_url, workflow, repo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, team, inputs_json, dispatched_at, actions_url, workflow, repo);

      logger.info('Recorded team dispatch', { id, team });
      res.status(201).json({ id, team, inputs: inputs || {}, dispatched_at, actions_url, workflow, repo });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
