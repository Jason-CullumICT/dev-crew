# API Contracts — Orchestrator Workflow Engine

This document defines the shared API contract for all clients of the orchestrator workflow engine. Both frontend and backend must implement these endpoints exactly as specified.

**Status:** WIP — dependency tracking feature [FR-070 through FR-085]

---

## Endpoint Categories

- [Work Items](#work-items)
- [Dependencies](#dependencies)

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

// Response Types
export interface PaginatedWorkItemsResponse { ... }
export interface ReadinessCheckResponse { ... }
export interface DashboardSummaryResponse { ... }
export interface DashboardActivityResponse { ... }
export interface ApiErrorResponse { ... }

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
| 2026-04-14 | Initial contract | Dependency tracking feature [FR-070–FR-085] |
