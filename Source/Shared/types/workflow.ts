// Verifies: FR-WF-001 — Shared domain types for the Self-Judging Workflow Engine

// --- Enums ---

export enum WorkItemStatus {
  Backlog = 'backlog',
  Routing = 'routing',
  Proposed = 'proposed',
  Reviewing = 'reviewing',
  Approved = 'approved',
  Rejected = 'rejected',
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed',
  PendingDependencies = 'pending-dependencies',
}

export enum WorkItemType {
  Feature = 'feature',
  Bug = 'bug',
  Issue = 'issue',
  Improvement = 'improvement',
}

export enum WorkItemPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum WorkItemSource {
  Browser = 'browser',
  Zendesk = 'zendesk',
  Manual = 'manual',
  Automated = 'automated',
}

export enum WorkItemComplexity {
  Trivial = 'trivial',
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  Complex = 'complex',
}

export enum WorkItemRoute {
  FastTrack = 'fast-track',
  FullReview = 'full-review',
}

export enum AssessmentVerdict {
  Approve = 'approve',
  Reject = 'reject',
  NeedsClarification = 'needs-clarification',
}

// --- Entities ---

export interface ChangeHistoryEntry {
  timestamp: string;
  agent: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}

export interface AssessmentRecord {
  role: string;
  verdict: AssessmentVerdict;
  notes: string;
  suggestedChanges: string[];
  timestamp: string;
}

// Verifies: FR-dependency-linking
export interface DependencyLink {
  id: string;
  blockerItemId: string;
  blockerItemType: WorkItemType;
  blockerTitle: string;
  blockerStatus: WorkItemStatus;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  docId: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  route?: WorkItemRoute;
  assignedTeam?: string;
  changeHistory: ChangeHistoryEntry[];
  assessments: AssessmentRecord[];
  // Verifies: FR-dependency-linking
  blockedBy?: DependencyLink[];
  blocks?: DependencyLink[];
  hasUnresolvedBlockers?: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

// --- API Request Types ---

export interface CreateWorkItemRequest {
  title: string;
  description: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  fastTrack?: boolean;
}

export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  complexity?: WorkItemComplexity;
}

export interface RouteWorkItemRequest {
  overrideRoute?: WorkItemRoute;
}

export interface AssessWorkItemRequest {
  notes?: string;
}

export interface ApproveWorkItemRequest {
  reason?: string;
}

export interface RejectWorkItemRequest {
  reason: string;
}

export interface DispatchWorkItemRequest {
  team: string;
}

// Verifies: FR-dependency-linking
export interface AddDependencyRequest {
  blockerItemId: string;
}

// Verifies: FR-dependency-linking
export interface UpdateDependenciesRequest {
  blockedBy?: string[];
}

// --- API Response Types ---

export interface PaginatedWorkItemsResponse {
  data: WorkItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummaryResponse {
  statusCounts: Record<string, number>;
  teamCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}

export interface DashboardActivityResponse {
  data: (ChangeHistoryEntry & { workItemId: string; workItemDocId: string })[];
}

export interface DashboardQueueResponse {
  data: QueueGroup[];
}

export interface QueueGroup {
  status: WorkItemStatus;
  count: number;
  items: WorkItem[];
}

// Verifies: FR-dependency-linking
export interface DependenciesResponse {
  data: DependencyLink[];
}

// Verifies: FR-dependency-ready-check
export interface DependencyReadyResponse {
  ready: boolean;
  unresolvedBlockers?: DependencyLink[];
  reason?: string;
}

// Verifies: FR-dependency-linking
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// --- Query Types ---

export interface WorkItemFilters {
  status?: WorkItemStatus;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  source?: WorkItemSource;
  assignedTeam?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Verifies: FR-WF-006 — Valid status transitions
// Verifies: FR-dependency-dispatch-gating — PendingDependencies blocks progression to InProgress
export const VALID_STATUS_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  [WorkItemStatus.Backlog]: [WorkItemStatus.Routing],
  [WorkItemStatus.Routing]: [WorkItemStatus.Proposed, WorkItemStatus.Approved],
  [WorkItemStatus.Proposed]: [WorkItemStatus.Reviewing, WorkItemStatus.Approved, WorkItemStatus.Rejected, WorkItemStatus.PendingDependencies],
  [WorkItemStatus.Reviewing]: [WorkItemStatus.Approved, WorkItemStatus.Rejected, WorkItemStatus.PendingDependencies],
  [WorkItemStatus.Approved]: [WorkItemStatus.InProgress, WorkItemStatus.PendingDependencies],
  [WorkItemStatus.Rejected]: [WorkItemStatus.Backlog],
  [WorkItemStatus.PendingDependencies]: [WorkItemStatus.Proposed, WorkItemStatus.Approved],
  [WorkItemStatus.InProgress]: [WorkItemStatus.Completed, WorkItemStatus.Failed],
  [WorkItemStatus.Completed]: [],
  [WorkItemStatus.Failed]: [WorkItemStatus.Backlog],
};
