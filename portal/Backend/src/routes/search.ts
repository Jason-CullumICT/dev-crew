// Verifies: FR-dependency-linking — Cross-entity search for the DependencyPicker
// Searches bugs and feature requests by title, returns combined results.

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database/connection';
import { withSpan } from '../lib/tracing';
import logger from '../lib/logger';
import type { BugReport, FeatureRequest } from '../../../Shared/types';
import { listBugs } from '../services/bugService';
import { listFeatureRequests } from '../services/featureRequestService';

const router = Router();

// GET /api/search?q=<term>
// Verifies: FR-dependency-linking
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('search', async (span) => {
      const q = (req.query.q as string || '').trim().toLowerCase();
      span.setAttribute('search.query', q);

      const db = getDb();
      const limit = 20;

      // Get all bugs and feature requests, then filter by title match
      const allBugs = listBugs(db);
      const allFRs = listFeatureRequests(db);

      const results: Array<BugReport | FeatureRequest> = [];

      // If no query, return recent items up to limit
      if (!q) {
        const combined = [...allBugs, ...allFRs]
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .slice(0, limit);
        logger.info('Search executed (empty query)', { resultCount: combined.length });
        res.json({ data: combined });
        return;
      }

      // Filter by title or ID match
      for (const bug of allBugs) {
        if (bug.title.toLowerCase().includes(q) || bug.id.toLowerCase().includes(q)) {
          results.push(bug);
        }
      }
      for (const fr of allFRs) {
        if (fr.title.toLowerCase().includes(q) || fr.id.toLowerCase().includes(q)) {
          results.push(fr);
        }
      }

      const limited = results.slice(0, limit);
      logger.info('Search executed', { query: q, resultCount: limited.length });
      res.json({ data: limited });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
