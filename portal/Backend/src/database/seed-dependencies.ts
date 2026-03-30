// Verifies: FR-dependency-linking — Seed known backlog dependency links
// Seeds the dependency relationships specified in the feature task.

import Database from 'better-sqlite3';
import { DependencyService, DependencyError } from '../services/dependencyService';
import { logger } from '../lib/logger';

// Verifies: FR-dependency-linking — Known backlog dependency definitions
export const KNOWN_DEPENDENCIES: Array<{
  blocked_id: string;
  blocker_ids: string[];
}> = [
  // BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
  {
    blocked_id: 'BUG-0010',
    blocker_ids: ['BUG-0003', 'BUG-0004', 'BUG-0005', 'BUG-0006', 'BUG-0007'],
  },
  // FR-0004 (configurable ports) blocked_by FR-0003 (configurable paths)
  {
    blocked_id: 'FR-0004',
    blocker_ids: ['FR-0003'],
  },
  // FR-0005 (worker Dockerfile languages) blocked_by FR-0002 (language detection)
  {
    blocked_id: 'FR-0005',
    blocker_ids: ['FR-0002'],
  },
  // FR-0007 (adaptive E2E) blocked_by FR-0003 (configurable paths)
  {
    blocked_id: 'FR-0007',
    blocker_ids: ['FR-0003'],
  },
  // Note: FR-0001 blocked_by FR-0001 is a self-reference — correctly rejected by DependencyService (409)
];

// Verifies: FR-dependency-linking — parseItemId for seed
function parseItemType(id: string): 'bug' | 'feature_request' {
  if (id.startsWith('BUG-')) return 'bug';
  return 'feature_request';
}

// Verifies: FR-dependency-linking — Seed all known dependencies, skipping missing items
export function seedKnownDependencies(db: Database.Database): {
  linked: number;
  skipped: number;
  errors: string[];
} {
  const depService = new DependencyService(db);
  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const dep of KNOWN_DEPENDENCIES) {
    const blockedType = parseItemType(dep.blocked_id);

    for (const blockerId of dep.blocker_ids) {
      const blockerType = parseItemType(blockerId);

      try {
        depService.addDependency(blockedType, dep.blocked_id, blockerType, blockerId);
        linked++;
        logger.info('Seeded dependency link', { blockedId: dep.blocked_id, blockerId });
      } catch (err) {
        if (err instanceof DependencyError) {
          if (err.statusCode === 404) {
            // Item doesn't exist yet — skip gracefully
            skipped++;
            logger.info('Skipped dependency seed (item not found)', {
              blockedId: dep.blocked_id, blockerId, reason: err.message,
            });
          } else {
            errors.push(`${dep.blocked_id} -> ${blockerId}: ${err.message}`);
            logger.warn('Dependency seed error', {
              blockedId: dep.blocked_id, blockerId, error: err.message,
            });
          }
        } else {
          throw err;
        }
      }
    }
  }

  logger.info('Dependency seeding complete', { linked, skipped, errorCount: errors.length });
  return { linked, skipped, errors };
}
