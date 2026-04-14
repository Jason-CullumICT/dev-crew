# API Contracts — Orchestrator Workflow Engine & Platform

This document defines the shared API contracts for clients of the orchestrator platform. It covers two layers:
- **Workflow Engine API** — Manages work items, assessments, and dependencies (application logic)
- **Orchestrator API** — Submits work requests with GitHub integration and pre-flight validation (platform infrastructure)

**Status:** Updated — pre-flight validation feature [FR-preflight-validator, FR-preflight-gating, FR-preflight-tests]

---

## Endpoint Categories

### Workflow Engine API
- [Work Items](#work-items)
- [Dependencies](#dependencies)

### Orchestrator API
- [Work Submission](#work-submission)

---

## Work Items

### List Work Items

**Verifies:** FR-WF-002 — Work item lifecycle management

```
GET /api/work-items
```

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `WorkItemStatus` | No | Filter by status |
| `type` | `WorkItemType` | No | Filter by type (feature/bug/issue/improvement) |
| `priority` | `WorkItemPriority` | No | Filter by priority |
| `source` | `WorkItemSource` | No | Filter by source |
| `assignedTeam` | `string` | No | Filter by assigned team |
| `page` | `number` | No | Pagination page (default: 1) |
| `limit` | `number` | No | Items per page (default: 20) |

**Response (200 OK):**

```typescript
PaginatedWorkItemsResponse {
  data: WorkItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

**Notes:**
- Each `WorkItem` in the response includes `blockedBy[]`, `blocks[]` (resolved dependency arrays)
- Each `WorkItem` includes `hasUnresolvedBlockers` flag indicating if any `blockedBy` items are unresolved

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 400 | `{error: "Invalid filter values"}` | Malformed query params |

---

### Get Work Item Detail

**Verifies:** FR-WF-003 — Work item state transitions

```
GET /api/work-items/:id
```

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Work item ID (e.g., "WI-001") |

**Response (200 OK):**

```typescript
WorkItem {
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
  blockedBy?: DependencyLink[];      // Resolved blocker items
  blocks?: DependencyLink[];         // Items blocked by this one
  hasUnresolvedBlockers?: boolean;   // True if any blockedBy item is unresolved
  changeHistory: ChangeHistoryEntry[];
  assessments: AssessmentRecord[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}
```

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 404 | `{error: "Work item not found"}` | ID does not exist |

---

### Create Work Item

**Verifies:** FR-WF-001 — Work item creation

```
POST /api/work-items
```

**Request Body:**

```typescript
CreateWorkItemRequest {
  title: string;
  description: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  fastTrack?: boolean;
}
```

**Response (201 Created):**

```typescript
WorkItem (newly created item with id, status=Backlog)
```

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 400 | `{error: "Missing required fields"}` | Validation error |

---

### Update Work Item

**Verifies:** FR-WF-003 — Work item updates; FR-dependency-api-types — blockedBy field

```
PATCH /api/work-items/:id
```

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Work item ID (e.g., "WI-001") |

**Request Body:**

```typescript
UpdateWorkItemRequest {
  title?: string;
  description?: string;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  complexity?: WorkItemComplexity;
  blockedBy?: string[];             // Array of blocker item IDs; replaces all dependencies
}
```

**Response (200 OK):**

```typescript
WorkItem (updated item)
```

**State Machine Rules:**

- **Dependency Check:** If transitioning to `approved` and `blockedBy` contains any unresolved items → set status to `pending_dependencies` instead
- **Auto-advance:** When a blocker transitions to `completed`/`rejected`, auto-advance dependent from `pending_dependencies` to `approved`

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 400 | `{error: "Invalid status transition"}` | Violates state machine |
| 404 | `{error: "Work item not found"}` | ID does not exist |
| 409 | `{error: "Circular dependency detected"}` | blocker_id creates cycle |

---

## Dependencies

### Add Dependency

**Verifies:** FR-dependency-dispatch-gating — Single link management

```
POST /api/work-items/:id/dependencies
```

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Work item ID (blocked item) |

**Request Body:**

```typescript
DependencyActionRequest {
  action: 'add';
  blockerId: string;      // ID of blocker item
}
```

**Response (201 Created):**

```typescript
{data: WorkItem}
```

**Validation Rules:**

- `blockerId` must exist (404 if not found)
- Cannot add self-reference (400)
- Cannot add if it creates a cycle (409 — returned with cycle path if helpful)

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 400 | `{error: "Cannot depend on self"}` | blockerId === id |
| 404 | `{error: "Blocker item not found"}` | blockerId does not exist |
| 409 | `{error: "Circular dependency detected"}` | Would create cycle |

---

### Remove Dependency

**Verifies:** FR-dependency-dispatch-gating — Single link removal

```
POST /api/work-items/:id/dependencies
```

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Work item ID (blocked item) |

**Request Body:**

```typescript
DependencyActionRequest {
  action: 'remove';
  blockerId: string;      // ID of blocker item to unlink
}
```

**Response (200 OK):**

```typescript
{data: WorkItem}
```

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 404 | `{error: "Work item not found"}` | id does not exist |
| 404 | `{error: "Dependency not found"}` | Link does not exist |

---

### Check Readiness

**Verifies:** FR-dependency-dispatch-gating — Readiness evaluation

```
GET /api/work-items/:id/ready
```

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Work item ID |

**Response (200 OK):**

```typescript
ReadinessCheckResponse {
  ready: boolean;
  unresolvedBlockers?: DependencyLink[];   // Only present if ready=false
}
```

**Notes:**
- `ready=true` when no `blockedBy` items exist OR all `blockedBy` items are in RESOLVED_STATUSES
- `unresolvedBlockers` includes full `DependencyLink` objects (blocker item ID, title, status inferred)

**Error Responses:**

| Status | Body | Notes |
|--------|------|-------|
| 404 | `{error: "Work item not found"}` | id does not exist |

---

## Work Submission

### Submit Work Request

**Verifies:** FR-preflight-validator, FR-preflight-gating, FR-preflight-tests — Pre-flight validation on work submission

```
POST /api/work
```

**Request Body:**

```typescript
{
  task: string;                    // Required: work description/prompt
  planFile?: string;               // Optional: path to plan file
  team?: string;                   // Optional: force assignment to 'TheATeam' or 'TheFixer'
  repo?: string;                   // Optional: GitHub repo (owner/name); falls back to config.githubRepo
  repoBranch?: string;             // Optional: git branch; falls back to config.githubBranch
  claudeSessionToken?: string;     // Optional: Anthropic API token
  tokenLabel?: string;             // Optional: label for token pool
  pipelineMode?: string;           // Optional: 'local' (default) or 'github_actions'
  images?: Array<{name, data}>;    // Optional: base64-encoded images or multipart form-data
}
```

**Response (201 Created):**

```typescript
{
  id: string;                      // Unique run ID (run-{timestamp}-{randomId})
  status: string;                  // Always "team_selecting" on submission
  message: string;                 // Status message
  statusUrl: string;               // URL to poll: /api/runs/:id
  attachments: number;             // Count of uploaded images
  ports?: object;                  // Port mappings (if available)
  branch?: string;                 // Git branch (if available)
}
```

**Pre-Flight Validation (before run is saved):**

1. **Repository Access Check** (if `resolvedRepo` is non-empty AND `config.githubToken` is set):
   - `GET https://api.github.com/repos/{resolvedRepo}` with `Authorization: token {githubToken}`
   - On success: proceed to branch check
   - On 401 Unauthorized: return 401 (token invalid)
   - On 403 Forbidden: return 401 (token lacks permission)
   - On 404 Not Found: return 404 (repo not found or no access)
   - On other errors: return 500 (GitHub API error)

2. **Branch Existence Check** (if repo validation passed):
   - `GET https://api.github.com/repos/{resolvedRepo}/branches/{resolvedBranch}`
   - On success: create and save run, return 201
   - On 404 Not Found: return 404 (branch not found)
   - On other errors: return 500 (GitHub API error)

3. **Backwards Compatibility**:
   - If `resolvedRepo` is empty or `config.githubToken` is not set, skip validation and proceed directly to saving the run

**Error Responses:**

| Status | Body | Trigger | Notes |
|--------|------|---------|-------|
| 400 | `{error: "Missing required field: task"}` | No `task` in request | Validation error |
| 401 | `{error: "GitHub token invalid or not provided"}` | Token missing/invalid; GitHub returns 401 or 403 on repo check | Pre-flight: token access denied |
| 404 | `{error: "Repo 'owner/repo' not found or token lacks access"}` | GitHub returns 404 on repo check | Pre-flight: repo not found |
| 404 | `{error: "Branch 'branch-name' not found in 'owner/repo'"}` | GitHub returns 404 on branch check | Pre-flight: branch does not exist |
| 500 | `{error: "GitHub API error: {status}"}` | GitHub returns 5xx or unexpected 4xx | Pre-flight: GitHub service error |
| 503 | `{error: "Orchestrator not initialized — Docker not available"}` | Orchestrator not ready | Infrastructure error |

**Implementation Notes:**

- **Token Resolution:** Uses `config.githubToken` (env: `GITHUB_TOKEN`). Per-request tokens are not supported for GitHub validation; only for Anthropic session tokens.
- **Resolver Chain:** 
  - `repo` = `req.body.repo` || `config.githubRepo`
  - `repoBranch` = `req.body.repoBranch` || `config.githubBranch`
- **No Side Effects:** Validation functions never create repos or branches — they only read repo metadata from GitHub API.
- **Run Creation:** Only after all pre-flight checks pass, the run object is created with status "team_selecting" and saved.
- **Async Execution:** After 201 response, the orchestrator begins async team selection and pipeline execution.

**Links:**

- Library: `platform/orchestrator/lib/github-validator.js` — exports `validateRepoAccess()`, `validateBranchExists()`
- Handler: `platform/orchestrator/server.js:350` — `POST /api/work` implementation
- Frontend: `portal/Frontend/src/components/bugs/BugDetail.tsx:290` — error display with pre-flight distinction

---

## Error Response Format

All error responses follow this format:

```typescript
ApiErrorResponse {
  error: string;           // Human-readable error message
  code?: string;           // Machine-readable error code (optional)
}
```

**Common Error Codes:**

| Code | Status | Meaning |
|------|--------|---------|
| `ITEM_NOT_FOUND` | 404 | Work item does not exist |
| `INVALID_STATUS_TRANSITION` | 400 | Status transition violates state machine |
| `CIRCULAR_DEPENDENCY` | 409 | Dependency operation would create a cycle |
| `SELF_REFERENCE` | 400 | Item cannot depend on itself |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `CONFLICT` | 409 | Request conflicts with current state (e.g., blocker not unresolved) |

---

## Response Envelope Format

**List responses (zero or more items):**

```typescript
{
  data: T[];
  page?: number;           // For paginated lists
  limit?: number;
  total?: number;
  totalPages?: number;
}
```

**Single-item responses:**

The item is returned directly (not wrapped):

```typescript
WorkItem (for GET /:id)
```

**Deletion responses:**

```
204 No Content (no body)
```

---

## Shared Type Definitions

All types referenced in this contract are exported from `Source/Shared/types/workflow.ts`:

```typescript
// Enums
export enum WorkItemStatus { ... }
export enum WorkItemType { ... }
export enum WorkItemPriority { ... }
export enum WorkItemSource { ... }
export enum WorkItemComplexity { ... }
export enum WorkItemRoute { ... }
export enum DependencyBlockageReason { ... }

// Entities
export interface WorkItem { ... }
export interface DependencyLink { ... }
export interface ChangeHistoryEntry { ... }
export interface AssessmentRecord { ... }

// Request Types
export interface CreateWorkItemRequest { ... }
export interface UpdateWorkItemRequest { ... }  // Includes blockedBy?: string[]
export interface RouteWorkItemRequest { ... }
export interface AssessWorkItemRequest { ... }
export interface ApproveWorkItemRequest { ... }
export interface RejectWorkItemRequest { ... }
export interface DispatchWorkItemRequest { ... }
export interface DependencyActionRequest { ... }
export interface WorkSubmissionRequest { ... }  // Orchestrator API: POST /api/work

// Response Types
export interface PaginatedWorkItemsResponse { ... }
export interface ReadinessCheckResponse { ... }
export interface DashboardSummaryResponse { ... }
export interface DashboardActivityResponse { ... }
export interface ApiErrorResponse { ... }
export interface WorkSubmissionResponse { ... }  // Orchestrator API: POST /api/work

// Constants
export const VALID_STATUS_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]>;
export const RESOLVED_STATUSES: WorkItemStatus[];
export const DISPATCH_TRIGGER_STATUSES: WorkItemStatus[];
```

---

## Implementation Notes

### Dependency Link Structure

```typescript
export interface DependencyLink {
  blockedItemId: string;         // The item being blocked
  blockedItemDocId: string;      // Document ID for audit/tracing
  blockerItemId: string;         // The item doing the blocking
  blockerItemDocId: string;      // Document ID for audit/tracing
  createdAt: string;             // ISO 8601 timestamp
}
```

### Resolved Statuses

Items transition their blockers out of "unresolved" when they reach one of:

```typescript
export const RESOLVED_STATUSES = [
  WorkItemStatus.Completed,
  WorkItemStatus.Rejected,
  WorkItemStatus.Failed,
];
```

### Dispatch Triggers

When a blocker item transitions to one of these statuses, any dependent items in `pending_dependencies` are automatically advanced to `approved`:

```typescript
export const DISPATCH_TRIGGER_STATUSES = [
  WorkItemStatus.Completed,
  WorkItemStatus.Rejected,
];
```

---

## Changelog

| Date | Change | Notes |
|------|--------|-------|
| 2026-04-14 | Add Orchestrator API section | Pre-flight validation on work submission [FR-preflight-validator, FR-preflight-gating, FR-preflight-tests] |
| 2026-04-14 | Initial contract | Dependency tracking feature [FR-070–FR-085] |
