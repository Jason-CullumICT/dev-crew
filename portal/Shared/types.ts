// Verifies: FR-0001 — Shared types for portal dependency linking
// Verifies: FR-dependency-linking — Extended with dispatch gating constants

// --- Status Enums ---

export type BugStatus =
  | 'new'
  | 'triaged'
  | 'approved'
  | 'in_development'
  | 'resolved'
  | 'closed'
  | 'pending_dependencies';

export type FeatureRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'in_development'
  | 'completed'
  | 'closed'
  | 'pending_dependencies';

// Verifies: FR-dependency-dispatch-gating — Statuses that count as "resolved" for dependency checking
export const RESOLVED_STATUSES: readonly string[] = [
  'completed',
  'resolved',
  'closed',
] as const;

// Verifies: FR-dependency-dispatch-gating — Statuses that trigger dispatch gating checks
export const DISPATCH_TRIGGER_STATUSES: readonly string[] = [
  'approved',
  'in_development',
] as const;

// --- Dependency Types ---

export type DependencyItemType = 'bug' | 'feature_request';

export interface DependencyLink {
  item_type: DependencyItemType;
  item_id: string;
  title: string;
  status: string;
}

export interface AddDependencyRequest {
  action: 'add';
  blocker_id: string;
}

export interface RemoveDependencyRequest {
  action: 'remove';
  blocker_id: string;
}

export type DependencyActionRequest = AddDependencyRequest | RemoveDependencyRequest;

export interface ReadyResponse {
  ready: boolean;
  unresolved_blockers: DependencyLink[];
}

// --- Core Entity Types ---

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  blocked_by: DependencyLink[];
  blocks: DependencyLink[];
  has_unresolved_blockers: boolean;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  blocked_by: DependencyLink[];
  blocks: DependencyLink[];
  has_unresolved_blockers: boolean;
}

// --- API Response Wrappers ---

export interface ListResponse<T> {
  data: T[];
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// --- Helper to parse item ID into type + id ---
// Verifies: FR-dependency-linking
export function parseItemId(id: string): { type: DependencyItemType; id: string } | null {
  if (id.startsWith('BUG-')) {
    return { type: 'bug', id };
  }
  if (id.startsWith('FR-')) {
    return { type: 'feature_request', id };
  }
  return null;
}
