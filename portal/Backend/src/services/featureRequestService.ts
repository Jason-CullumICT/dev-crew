// Verifies: FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012
// Feature Request service — all business logic; no framework imports.

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import type {
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestSource,
  Priority,
  Vote,
  VoteDecision,
  DependencyLink,
} from '../../../Shared/types';
import { RESOLVED_STATUSES, HIDDEN_STATUSES, DISPATCH_TRIGGER_STATUSES } from '../../../Shared/types';
import { DependencyService } from './dependencyService';
import { simulateVoting, buildVoteRecords, VoteSimulatorOptions } from './votingService';
import { AppError } from '../middleware/errorHandler';

// --- Valid enum values (DD-8) ---
export const VALID_SOURCES: FeatureRequestSource[] = ['manual', 'zendesk', 'competitor_analysis', 'code_review'];
export const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];
// Verifies: FR-DUP-01
export const VALID_STATUSES: FeatureRequestStatus[] = ['potential', 'voting', 'approved', 'denied', 'in_development', 'completed', 'pending_dependencies', 'duplicate', 'deprecated'];

// --- Input length limits (Security M-04) ---
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10000;

// --- Status transition rules (via PATCH) ---
// potential → voting
// voting → approved (via approve endpoint only)
// voting → denied (via deny endpoint)
// approved → in_development
// in_development → completed
// Verifies: FR-DUP-04 — duplicate/deprecated allowed from any status (terminal dispositions)
const STATUS_TRANSITIONS: Record<FeatureRequestStatus, FeatureRequestStatus[]> = {
  potential: ['voting', 'duplicate', 'deprecated'],
  voting: ['approved', 'denied', 'duplicate', 'deprecated'],
  approved: ['in_development', 'duplicate', 'deprecated'],
  in_development: ['completed', 'duplicate', 'deprecated'],
  denied: ['duplicate', 'deprecated'],
  completed: ['duplicate', 'deprecated'],
  pending_dependencies: ['approved', 'duplicate', 'deprecated'], // Verifies: FR-dependency-dispatch-gating
  duplicate: [],     // Verifies: FR-DUP-04 — terminal status
  deprecated: [],    // Verifies: FR-DUP-04 — terminal status
};

// --- ID generation ---
function generateFRId(db: Database.Database): string {
  const row = db.prepare(`SELECT id FROM feature_requests ORDER BY id DESC LIMIT 1`).get() as { id: string } | undefined;
  let next = 1;
  if (row) {
    const match = row.id.match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `FR-${String(next).padStart(4, '0')}`;
}

// --- Jaccard similarity for duplicate detection ---
/**
 * Compute Jaccard similarity between two strings based on word sets.
 * Returns a value in [0, 1]. A result > 0.8 triggers duplicate_warning.
 * Pure function — no framework imports.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

// --- DB row mapping ---
interface FRRow {
  id: string;
  title: string;
  description: string;
  source: string;
  status: string;
  priority: string;
  human_approval_comment: string | null;
  human_approval_approved_at: string | null;
  duplicate_warning: number;
  created_at: string;
  target_repo: string | null;
  duplicate_of: string | null;         // Verifies: FR-DUP-02
  deprecation_reason: string | null;   // Verifies: FR-DUP-02
  updated_at: string;
}

interface VoteRow {
  id: string;
  feature_request_id: string;
  agent_name: string;
  decision: string;
  comment: string;
  created_at: string;
}

function mapFRRow(db: Database.Database, row: FRRow, votes: Vote[]): FeatureRequest {
  const depService = new DependencyService(db);
  const id = row.id;

  // Verifies: FR-DUP-03 — Compute duplicated_by from DB
  const duplicatedByRows = db.prepare(
    `SELECT id FROM feature_requests WHERE duplicate_of = ?`
  ).all(id) as Array<{ id: string }>;

  return {
    id,
    title: row.title,
    description: row.description,
    source: row.source as FeatureRequestSource,
    status: row.status as FeatureRequestStatus,
    priority: row.priority as Priority,
    votes,
    human_approval_comment: row.human_approval_comment,
    human_approval_approved_at: row.human_approval_approved_at,
    duplicate_warning: row.duplicate_warning === 1,
    target_repo: row.target_repo || null,
    duplicate_of: row.duplicate_of || null,                        // Verifies: FR-DUP-02
    deprecation_reason: row.deprecation_reason || null,            // Verifies: FR-DUP-02
    duplicated_by: duplicatedByRows.map(r => r.id),                // Verifies: FR-DUP-03
    created_at: row.created_at,
    updated_at: row.updated_at,
    blocked_by: depService.getBlockedBy('feature_request', id),
    blocks: depService.getBlocks('feature_request', id),
    has_unresolved_blockers: depService.hasUnresolvedBlockers('feature_request', id),
  };
}

function getVotesForFR(db: Database.Database, frId: string): Vote[] {
  const rows = db.prepare(`SELECT * FROM votes WHERE feature_request_id = ? ORDER BY created_at ASC`).all(frId) as VoteRow[];
  return rows.map((r) => ({
    id: r.id,
    feature_request_id: r.feature_request_id,
    agent_name: r.agent_name,
    decision: r.decision as VoteDecision,
    comment: r.comment,
    created_at: r.created_at,
  }));
}

// --- Service methods ---

export interface ListFeatureRequestsOptions {
  status?: string;
  source?: string;
  include_hidden?: boolean;  // Verifies: FR-DUP-05
}

// Verifies: FR-DUP-05
export function listFeatureRequests(
  db: Database.Database,
  opts: ListFeatureRequestsOptions = {}
): FeatureRequest[] {
  let query = `SELECT * FROM feature_requests WHERE 1=1`;
  const params: string[] = [];

  // Verifies: FR-DUP-05 — Exclude hidden statuses by default
  if (!opts.include_hidden) {
    query += ` AND status NOT IN (${HIDDEN_STATUSES.map(() => '?').join(', ')})`;
    params.push(...HIDDEN_STATUSES as unknown as string[]);
  }

  if (opts.status) {
    query += ` AND status = ?`;
    params.push(opts.status);
  }
  if (opts.source) {
    query += ` AND source = ?`;
    params.push(opts.source);
  }

  query += ` ORDER BY created_at DESC`;
  const rows = db.prepare(query).all(...params) as FRRow[];
  return rows.map((row) => mapFRRow(db, row, getVotesForFR(db, row.id)));
}

export interface CreateFeatureRequestInput {
  title: string;
  description: string;
  source?: string;
  priority?: string;
  target_repo?: string;
  blocked_by?: string[];                      // Verifies: FR-dependency-linking
}

export function createFeatureRequest(
  db: Database.Database,
  input: CreateFeatureRequestInput
): FeatureRequest {
  const { title, description } = input;
  const source = (input.source || 'manual') as FeatureRequestSource;
  const priority = (input.priority || 'medium') as Priority;

  // Validate input lengths (Security M-04)
  if (title.length > TITLE_MAX_LENGTH) {
    throw new AppError(400, `title must be at most ${TITLE_MAX_LENGTH} characters`);
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new AppError(400, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
  }

  // Validate enums (DD-8)
  if (!VALID_SOURCES.includes(source)) {
    throw new AppError(400, `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`);
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new AppError(400, `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Duplicate detection: Jaccard similarity > 0.8 on titles
  const existingRows = db.prepare(`SELECT id, title FROM feature_requests`).all() as Array<{ id: string; title: string }>;
  let duplicateWarning = false;
  for (const row of existingRows) {
    if (jaccardSimilarity(title, row.title) > 0.8) {
      duplicateWarning = true;
      break;
    }
  }

  const id = generateFRId(db);
  const now = new Date().toISOString();

  // Handle dependencies if provided
  const depService = new DependencyService(db);
  if (input.blocked_by && input.blocked_by.length > 0) {
    depService.setDependencies('feature_request', id, input.blocked_by);
  }

  db.prepare(`
    INSERT INTO feature_requests
      (id, title, description, source, status, priority, human_approval_comment,
       human_approval_approved_at, duplicate_warning, target_repo, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'potential', ?, NULL, NULL, ?, ?, ?, ?)
  `).run(id, title, description, source, priority, duplicateWarning ? 1 : 0, input.target_repo || null, now, now);

  return getFeatureRequestById(db, id)!;
}

export function getFeatureRequestById(
  db: Database.Database,
  id: string
): FeatureRequest | null {
  const row = db.prepare(`SELECT * FROM feature_requests WHERE id = ?`).get(id) as FRRow | undefined;
  if (!row) return null;
  return mapFRRow(db, row, getVotesForFR(db, row.id));
}

export interface UpdateFeatureRequestInput {
  status?: string;
  description?: string;
  priority?: string;
  duplicate_of?: string;                      // Verifies: FR-DUP-04
  deprecation_reason?: string;                // Verifies: FR-DUP-04
  blocked_by?: string[];                      // Verifies: FR-dependency-linking
}

export function updateFeatureRequest(
  db: Database.Database,
  id: string,
  input: UpdateFeatureRequestInput
): FeatureRequest {
  const fr = getFeatureRequestById(db, id);
  if (!fr) throw new AppError(404, `Feature request ${id} not found`);

  const depService = new DependencyService(db);
  const updates: string[] = [];
  const params: unknown[] = [];

  let newStatus = input.status as FeatureRequestStatus | undefined;
  if (input.status !== undefined) {
    const currentStatus = fr.status;
    newStatus = input.status as FeatureRequestStatus;

    if (!VALID_STATUSES.includes(newStatus)) {
      throw new AppError(400, `Invalid status: ${input.status}`);
    }

    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        400,
        `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // Verifies: FR-DUP-04 — Validate duplicate_of when setting status to duplicate
    if (newStatus === 'duplicate') {
      if (!input.duplicate_of) {
        throw new AppError(400, `duplicate_of is required when status is 'duplicate'`);
      }
      if (input.duplicate_of === id) {
        throw new AppError(400, `An item cannot be a duplicate of itself`);
      }
      // Verifies: FR-DUP-07 — Validate reference exists
      const canonical = db.prepare(`SELECT id FROM feature_requests WHERE id = ?`).get(input.duplicate_of);
      if (!canonical) {
        throw new AppError(400, `duplicate_of references non-existent feature request: ${input.duplicate_of}`);
      }
      updates.push(`duplicate_of = ?`);
      params.push(input.duplicate_of);
      // Clear deprecation_reason when marking as duplicate
      updates.push(`deprecation_reason = ?`);
      params.push(null);
    } else if (newStatus === 'deprecated') {
      // Verifies: FR-DUP-04 — Accept optional deprecation_reason
      updates.push(`deprecation_reason = ?`);
      params.push(input.deprecation_reason || null);
      // Clear duplicate_of when marking as deprecated
      updates.push(`duplicate_of = ?`);
      params.push(null);
    } else {
      // Transitioning to a non-duplicate/deprecated status: clear both fields
      updates.push(`duplicate_of = ?`);
      params.push(null);
      updates.push(`deprecation_reason = ?`);
      params.push(null);
    }

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check
    if (DISPATCH_TRIGGER_STATUSES.includes(newStatus)) {
      const readiness = depService.isReady('feature_request', id);
      if (!readiness.ready) {
        newStatus = 'pending_dependencies';
      }
    }

    updates.push(`status = ?`);
    params.push(newStatus);
  }

  if (input.description !== undefined) {
    if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new AppError(400, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
    }
    updates.push(`description = ?`);
    params.push(input.description);
  }

  if (input.priority !== undefined) {
    const priority = input.priority as Priority;
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new AppError(400, `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    updates.push(`priority = ?`);
    params.push(priority);
  }

  // Handle dependencies bulk set
  if (input.blocked_by !== undefined) {
    depService.setDependencies('feature_request', id, input.blocked_by);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE feature_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  // Verifies: FR-dependency-dispatch-gating — Cascade on completion
  if (newStatus && RESOLVED_STATUSES.includes(newStatus) && !RESOLVED_STATUSES.includes(fr.status)) {
    depService.onItemCompleted('feature_request', id);
  }

  return getFeatureRequestById(db, id)!;
}

export function deleteFeatureRequest(db: Database.Database, id: string): void {
  const fr = getFeatureRequestById(db, id);
  if (!fr) throw new AppError(404, `Feature request ${id} not found`);

  db.prepare(`DELETE FROM votes WHERE feature_request_id = ?`).run(id);
  db.prepare(`DELETE FROM feature_requests WHERE id = ?`).run(id);
}

// --- Approve feature request (FR-011) ---
// DD-1: FR must be in 'voting' status AND majority vote must be 'approve'

export function approveFeatureRequest(db: Database.Database, id: string): FeatureRequest {
  const fr = getFeatureRequestById(db, id);
  if (!fr) throw new AppError(404, `Feature request ${id} not found`);

  if (fr.status !== 'voting') {
    throw new AppError(409, `Feature request must be in 'voting' status to approve. Current status: ${fr.status}`);
  }

  // Check majority vote is 'approve'
  const approveCount = fr.votes.filter((v) => v.decision === 'approve').length;
  const denyCount = fr.votes.filter((v) => v.decision === 'deny').length;

  if (fr.votes.length === 0 || approveCount <= denyCount) {
    throw new AppError(409, `Cannot approve: majority vote is not 'approve'. Approve: ${approveCount}, Deny: ${denyCount}`);
  }

  const depService = new DependencyService(db);
  let newStatus: FeatureRequestStatus = 'approved';

  // Verifies: FR-dependency-dispatch-gating — Dispatch gating check
  const readiness = depService.isReady('feature_request', id);
  if (!readiness.ready) {
    newStatus = 'pending_dependencies';
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE feature_requests
    SET status = ?, human_approval_approved_at = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, now, now, id);

  return getFeatureRequestById(db, id)!;
}

// --- Deny feature request (FR-012) ---
// DD-5: FR must be in 'potential' or 'voting' status

export function denyFeatureRequest(
  db: Database.Database,
  id: string,
  comment: string
): FeatureRequest {
  const fr = getFeatureRequestById(db, id);
  if (!fr) throw new AppError(404, `Feature request ${id} not found`);

  if (fr.status !== 'potential' && fr.status !== 'voting') {
    throw new AppError(
      409,
      `Cannot deny feature request with status '${fr.status}'. Only 'potential' or 'voting' FRs can be denied.`
    );
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE feature_requests
    SET status = 'denied', human_approval_comment = ?, updated_at = ?
    WHERE id = ?
  `).run(comment, now, id);

  return getFeatureRequestById(db, id)!;
}

export function voteOnFeatureRequest(
  db: Database.Database,
  id: string,
  options: VoteSimulatorOptions = {}
): FeatureRequest {
  const fr = getFeatureRequestById(db, id);
  if (!fr) throw new AppError(404, `Feature request ${id} not found`);

  // Must be in 'potential' status to trigger voting
  if (fr.status !== 'potential') {
    throw new AppError(400, `Feature request must be in 'potential' status to trigger voting. Current status: ${fr.status}`);
  }

  const now = new Date().toISOString();

  // Simulate votes
  const simResult = simulateVoting(id, options);
  const voteRecords = buildVoteRecords(simResult, now);

  // Persist votes
  const insertVote = db.prepare(`
    INSERT INTO votes (id, feature_request_id, agent_name, decision, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Transition FR to 'voting' status (DD-1: stays in voting regardless of majority)
  // Majority result is advisory only; human must call /approve or /deny to finalize
  const insertAll = db.transaction(() => {
    for (const vote of voteRecords) {
      insertVote.run(vote.id, vote.feature_request_id, vote.agent_name, vote.decision, vote.comment, vote.created_at);
    }
    db.prepare(`UPDATE feature_requests SET status = 'voting', updated_at = ? WHERE id = ?`).run(now, id);
  });

  insertAll();

  return getFeatureRequestById(db, id)!;
}
