// Verifies: FR-DUP-030 — Feature request service layer with duplicate/deprecated logic

import { FeatureRequest, FeatureRequestStatus } from '../../../Shared/types';
import { FeatureRequestRow } from '../database/schema';
import { getFeatureRequestsStore } from '../database/db';
import { logger } from '../middleware/logger';
import { metrics } from '../middleware/metrics';

// Verifies: FR-DUP-006 — Compute duplicated_by reverse lookup
function computeDuplicatedBy(frId: string, store: FeatureRequestRow[]): string[] {
  return store
    .filter((fr) => fr.duplicate_of === frId)
    .map((fr) => fr.id);
}

// Verifies: FR-DUP-031 — Convert a FeatureRequestRow to a FeatureRequest with computed fields
function rowToFeatureRequest(row: FeatureRequestRow, store: FeatureRequestRow[]): FeatureRequest {
  const fr: FeatureRequest = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as FeatureRequestStatus,
    priority: row.priority as FeatureRequest['priority'],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.duplicate_of) {
    fr.duplicate_of = row.duplicate_of;
  }
  if (row.deprecation_reason) {
    fr.deprecation_reason = row.deprecation_reason;
  }

  const duplicatedBy = computeDuplicatedBy(row.id, store);
  if (duplicatedBy.length > 0) {
    fr.duplicated_by = duplicatedBy;
  }

  return fr;
}

// Verifies: FR-DUP-032 — List feature requests with default hiding of duplicate/deprecated
export function listFeatureRequests(options: { include_hidden?: boolean } = {}): FeatureRequest[] {
  const store = getFeatureRequestsStore();
  let filtered = store;

  if (!options.include_hidden) {
    // Verifies: FR-DUP-021 — Exclude duplicate and deprecated items by default
    filtered = store.filter(
      (fr) => fr.status !== 'duplicate' && fr.status !== 'deprecated'
    );
  }

  logger.info('featureRequests.list', {
    include_hidden: options.include_hidden ?? false,
    total: store.length,
    returned: filtered.length,
  });
  metrics.increment('feature_requests_list_total', { include_hidden: String(options.include_hidden ?? false) });

  return filtered.map((row) => rowToFeatureRequest(row, store));
}

// Verifies: FR-DUP-033 — Get single feature request by ID (always returns regardless of status)
export function getFeatureRequestById(id: string): FeatureRequest | null {
  const store = getFeatureRequestsStore();
  const row = store.find((fr) => fr.id === id);
  if (!row) {
    return null;
  }

  logger.info('featureRequests.get', { id });
  metrics.increment('feature_requests_get_total');

  return rowToFeatureRequest(row, store);
}

// Verifies: FR-DUP-034 — Validate and apply duplicate/deprecated status changes
export interface UpdateFeatureRequestInput {
  status?: FeatureRequestStatus;
  title?: string;
  description?: string;
  priority?: FeatureRequest['priority'];
  duplicate_of?: string;
  deprecation_reason?: string;
}

export interface UpdateFeatureRequestResult {
  success: boolean;
  featureRequest?: FeatureRequest;
  error?: string;
  statusCode?: number;
}

export function updateFeatureRequest(id: string, input: UpdateFeatureRequestInput): UpdateFeatureRequestResult {
  const store = getFeatureRequestsStore();
  const rowIndex = store.findIndex((fr) => fr.id === id);
  if (rowIndex === -1) {
    return { success: false, error: 'Feature request not found', statusCode: 404 };
  }

  const row = store[rowIndex];

  // Verifies: FR-DUP-035 — Validate duplicate status
  if (input.status === 'duplicate') {
    if (!input.duplicate_of) {
      logger.warn('featureRequests.update.duplicate_missing_target', { id });
      return {
        success: false,
        error: 'duplicate_of is required when status is duplicate',
        statusCode: 400,
      };
    }

    // Verifies: FR-DUP-036 — Cannot duplicate to self
    if (input.duplicate_of === id) {
      logger.warn('featureRequests.update.duplicate_self_reference', { id });
      return {
        success: false,
        error: 'Cannot mark an item as a duplicate of itself',
        statusCode: 422,
      };
    }

    // Verifies: FR-DUP-037 — Target must exist
    const target = store.find((fr) => fr.id === input.duplicate_of);
    if (!target) {
      logger.warn('featureRequests.update.duplicate_target_not_found', { id, target: input.duplicate_of });
      return {
        success: false,
        error: `Duplicate target ${input.duplicate_of} does not exist`,
        statusCode: 404,
      };
    }

    // Verifies: FR-DUP-038 — No chains: target must not itself be a duplicate
    if (target.status === 'duplicate') {
      logger.warn('featureRequests.update.duplicate_chain', { id, target: input.duplicate_of });
      return {
        success: false,
        error: `Cannot mark as duplicate of ${input.duplicate_of} because it is itself a duplicate`,
        statusCode: 422,
      };
    }

    row.duplicate_of = input.duplicate_of;
    row.deprecation_reason = null; // Clear deprecation_reason when marking as duplicate
    row.status = 'duplicate';

    logger.info('featureRequests.update.marked_duplicate', { id, duplicate_of: input.duplicate_of });
    metrics.increment('feature_requests_marked_duplicate_total');
  }
  // Verifies: FR-DUP-039 — Validate deprecated status
  else if (input.status === 'deprecated') {
    row.deprecation_reason = input.deprecation_reason ?? null;
    row.duplicate_of = null; // Clear duplicate_of when marking as deprecated
    row.status = 'deprecated';

    logger.info('featureRequests.update.marked_deprecated', { id, reason: input.deprecation_reason });
    metrics.increment('feature_requests_marked_deprecated_total');
  }
  // Verifies: FR-DUP-040 — Reopen clears metadata
  else if (input.status) {
    if (row.status === 'duplicate' || row.status === 'deprecated') {
      row.duplicate_of = null;
      row.deprecation_reason = null;
      logger.info('featureRequests.update.restored', { id, from: row.status, to: input.status });
      metrics.increment('feature_requests_restored_total');
    }
    row.status = input.status;
  }

  // Apply other field updates
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.priority !== undefined) row.priority = input.priority;

  row.updated_at = new Date().toISOString();

  return { success: true, featureRequest: rowToFeatureRequest(row, store) };
}

// Create a new feature request
export function createFeatureRequest(input: { id: string; title: string; description: string; priority?: FeatureRequest['priority'] }): FeatureRequest {
  const store = getFeatureRequestsStore();
  const now = new Date().toISOString();
  const row: FeatureRequestRow = {
    id: input.id,
    title: input.title,
    description: input.description,
    status: 'open',
    priority: input.priority ?? 'medium',
    created_at: now,
    updated_at: now,
    duplicate_of: null,
    deprecation_reason: null,
  };
  store.push(row);

  logger.info('featureRequests.create', { id: input.id });
  metrics.increment('feature_requests_created_total');

  return rowToFeatureRequest(row, store);
}
