// Verifies: FR-dependency-search — GET /api/search?q= cross-entity typeahead search
import { Router, Request, Response } from 'express';
import * as store from '../store/workItemStore';
import { logger } from '../utils/logger';

const router = Router();

// Verifies: FR-dependency-search — Returns work items matching q in title or description.
// Special characters (%, _, [, etc.) are safe because the store uses plain String.includes(),
// not a regex or SQL LIKE clause.
router.get('/', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';

  try {
    const data = store.searchItems(q);
    logger.info('Search executed', { q, resultCount: data.length });
    res.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    logger.error('Search error', { q, error: message });
    throw err; // delegate to errorHandler middleware
  }
});

export default router;
