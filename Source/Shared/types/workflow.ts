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

export enum DependencyBlockageReason {
  UnresolvedDependency = 'unresolved-dependency',
  WaitingForBlocker = 'waiting-for-blocker',
}

export interface DependencyLink {
  blockedItemId: string;
  blockedItemDocId: string;
  blockerItemId: string;
  blockerItemDocId: string;
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
  blockedBy?: string[];
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

export interface DependencyActionRequest {
  action: 'add' | 'remove';
  blockerId: string;
}

// --- Orchestrator API Request/Response Types ---
// Verifies: FR-preflight-validator, FR-preflight-gating — Work submission with pre-flight validation

export interface WorkSubmissionRequest {
  task: string;                          // Required: work description/prompt
  planFile?: string;                     // Optional: path to plan file
  team?: string;                         // Optional: force assignment to 'TheATeam' or 'TheFixer'
  repo?: string;                         // Optional: GitHub repo (owner/name); falls back to config
  repoBranch?: string;                   // Optional: git branch; falls back to config
  claudeSessionToken?: string;           // Optional: Anthropic API token
  tokenLabel?: string;                   // Optional: label for token pool
  pipelineMode?: string;                 // Optional: 'local' (default) or 'github_actions'
  images?: Array<{name: string, data: string}>; // Optional: base64-encoded images
}

export interface WorkSubmissionResponse {
  id: string;                            // Unique run ID (run-{timestamp}-{randomId})
  status: string;                        // Always "team_selecting" on submission
  message: string;                       // Status message
  statusUrl: string;                     // URL to poll: /api/runs/:id
  attachments: number;                   // Count of uploaded images
  ports?: Record<string, unknown>;       // Port mappings (if available)
  branch?: string;                       // Git branch (if available)
}

export interface ReadinessCheckResponse {
  ready: boolean;
  unresolvedBlockers?: DependencyLink[];
}

// --- API Response Types ---

export interface PaginatedWorkItemsResponse {
  data: WorkItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
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
// Verifies: FR-dependency-dispatch-gating — Support for pending_dependencies blocking
export const VALID_STATUS_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  [WorkItemStatus.Backlog]: [WorkItemStatus.Routing],
  [WorkItemStatus.Routing]: [WorkItemStatus.Proposed, WorkItemStatus.Approved],
  [WorkItemStatus.Proposed]: [WorkItemStatus.Reviewing, WorkItemStatus.Approved, WorkItemStatus.Rejected],
  [WorkItemStatus.Reviewing]: [WorkItemStatus.Approved, WorkItemStatus.Rejected],
  [WorkItemStatus.Approved]: [WorkItemStatus.InProgress],
  [WorkItemStatus.Rejected]: [WorkItemStatus.Backlog],
  [WorkItemStatus.InProgress]: [WorkItemStatus.Completed, WorkItemStatus.Failed],
  [WorkItemStatus.Completed]: [],
  [WorkItemStatus.Failed]: [WorkItemStatus.Backlog],
};

// Verifies: FR-dependency-dispatch-gating — Resolved statuses (no longer blocking dependents)
export const RESOLVED_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.Completed,
  WorkItemStatus.Rejected,
  WorkItemStatus.Failed,
];

// Verifies: FR-dependency-dispatch-gating — Dispatch trigger statuses (unblock dependents on these transitions)
export const DISPATCH_TRIGGER_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.Completed,
  WorkItemStatus.Rejected,
];
