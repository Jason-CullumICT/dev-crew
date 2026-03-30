// Verifies: FR-dependency-linking — Express application setup with seed data
import express from 'express';
import Database from 'better-sqlite3';
import { getDatabase } from './database/connection';
import { createBugRouter } from './routes/bugs';
import { createFeatureRequestRouter } from './routes/featureRequests';
import { DependencyService } from './services/dependencyService';
import { logger } from './logger';

// Verifies: FR-dependency-linking — Create and configure Express app
export function createApp(db?: Database.Database): express.Application {
  const database = db ?? getDatabase();
  const app = express();

  app.use(express.json());

  // Verifies: FR-dependency-linking — Mount route handlers
  app.use('/api/bugs', createBugRouter(database));
  app.use('/api/feature-requests', createFeatureRequestRouter(database));

  return app;
}

// Verifies: FR-dependency-linking — Seed known dependency relationships
export function seedDependencies(db: Database.Database): void {
  const depService = new DependencyService(db);

  const seeds: Array<{
    blockedType: 'bug' | 'feature_request';
    blockedId: string;
    blockerType: 'bug' | 'feature_request';
    blockerId: string;
  }> = [
    // BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
    { blockedType: 'bug', blockedId: 'BUG-0010', blockerType: 'bug', blockerId: 'BUG-0003' },
    { blockedType: 'bug', blockedId: 'BUG-0010', blockerType: 'bug', blockerId: 'BUG-0004' },
    { blockedType: 'bug', blockedId: 'BUG-0010', blockerType: 'bug', blockerId: 'BUG-0005' },
    { blockedType: 'bug', blockedId: 'BUG-0010', blockerType: 'bug', blockerId: 'BUG-0006' },
    { blockedType: 'bug', blockedId: 'BUG-0010', blockerType: 'bug', blockerId: 'BUG-0007' },
    // FR-0004 blocked_by FR-0003
    { blockedType: 'feature_request', blockedId: 'FR-0004', blockerType: 'feature_request', blockerId: 'FR-0003' },
    // FR-0005 blocked_by FR-0002
    { blockedType: 'feature_request', blockedId: 'FR-0005', blockerType: 'feature_request', blockerId: 'FR-0002' },
    // FR-0007 blocked_by FR-0003
    { blockedType: 'feature_request', blockedId: 'FR-0007', blockerType: 'feature_request', blockerId: 'FR-0003' },
  ];

  for (const seed of seeds) {
    try {
      depService.addDependency(seed.blockedType, seed.blockedId, seed.blockerType, seed.blockerId);
    } catch (err) {
      // Items may not exist yet in test/dev; log and continue
      logger.warn({ seed, err }, 'Failed to seed dependency (item may not exist)');
    }
  }

  logger.info({ count: seeds.length }, 'Dependency seeding complete');
}
