# API Contracts — Workflow Engine

**Version:** 1.0  
**Last Updated:** 2026-04-14

This document defines the contract between backend and frontend for all work item and dependency management endpoints. All changes to request/response shapes must be coordinated with both teams.

---

## Response Patterns

All endpoints follow standard response patterns:

| Pattern | Shape | Example |
|---------|-------|---------|
| Paginated list | `PaginatedResponse<T>` | `{data: WorkItem[], page, limit, total, totalPages}` |
| Simple list | `DataResponse<T>` | `{data: DependencyLink[]}` |
| Single item | `T` directly | `WorkItem` object |
| Delete | `204 No Content` | (no body) |
| Error | `ApiErrorResponse` | `{error: "message", code?: string, details?: unknown}` |

---

## Work Item Endpoints

### List Work Items

```
GET /api/work-items
```

**Query Parameters:**
- `status?: WorkItemStatus` — Filter by status
- `type?: WorkItemType` — Filter by type
- `priority?: WorkItemPriority` — Filter by priority
- `source?: WorkItemSource` — Filter by source
- `assignedTeam?: string` — Filter by assigned team
- `page?: number` — Page number (default: 1)
- `limit?: number` — Items per page (default: 20)

**Response:** `PaginatedWorkItemsResponse`  
**Status Codes:** 200 OK, 400 Bad Request

---

### Get Work Item

```
GET /api/work-items/{id}
```

**Path Parameters:**
- `id: string` — Work item ID (e.g., `WI-123`, `BUG-456`)

**Response:** `WorkItem`  
**Status Codes:** 200 OK, 404 Not Found

---

### Create Work Item

```
POST /api/work-items
```

**Request Body:** `CreateWorkItemRequest`
```typescript
{
  title: string;
  description: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  fastTrack?: boolean;
}
```

**Response:** `WorkItem` (newly created)  
**Status Codes:** 201 Created, 400 Bad Request

---

### Update Work Item

```
PATCH /api/work-items/{id}
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `UpdateWorkItemRequest`
```typescript
{
  title?: string;
  description?: string;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  complexity?: WorkItemComplexity;
}
```

**Response:** `WorkItem` (updated)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found, 409 Conflict (if status transition invalid)

---

### Delete Work Item

```
DELETE /api/work-items/{id}
```

**Path Parameters:**
- `id: string` — Work item ID

**Response:** `204 No Content`  
**Status Codes:** 204 No Content, 404 Not Found

---

### Route Work Item

```
POST /api/work-items/{id}/route
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `RouteWorkItemRequest`
```typescript
{
  overrideRoute?: WorkItemRoute;  // 'fast-track' | 'full-review'
}
```

**Response:** `WorkItem` (updated with routing decision)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found

---

### Assess Work Item

```
POST /api/work-items/{id}/assess
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `AssessWorkItemRequest`
```typescript
{
  notes?: string;
}
```

**Response:** `WorkItem` (with new assessment appended to `assessments` array)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found

---

### Approve Work Item

```
POST /api/work-items/{id}/approve
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `ApproveWorkItemRequest`
```typescript
{
  reason?: string;
}
```

**Response:** `WorkItem` (status → `approved`)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found, 409 Conflict (if dependencies unresolved)

---

### Reject Work Item

```
POST /api/work-items/{id}/reject
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `RejectWorkItemRequest`
```typescript
{
  reason: string;
}
```

**Response:** `WorkItem` (status → `rejected`)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found

---

### Dispatch Work Item

```
POST /api/work-items/{id}/dispatch
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `DispatchWorkItemRequest`
```typescript
{
  team: string;
}
```

**Response:** `WorkItem` (status → `in-progress`, `assignedTeam` set)  
**Status Codes:** 200 OK, 400 Bad Request, 404 Not Found, 409 Conflict (if dependencies unresolved)

**Note:** Dispatch fails with 409 if work item is in `pending-dependencies` status or has unresolved blockers.

---

## Dependency Endpoints

### Add Dependency

```
POST /api/work-items/{id}/dependencies
```

**Path Parameters:**
- `id: string` — Work item ID (the item being blocked)

**Request Body:** `AddDependencyRequest`
```typescript
{
  blockerItemId: string;  // ID of the work item that must complete first
}
```

**Response:** `WorkItem` (updated with new dependency in `blockedBy` array)  
**Status Codes:** 201 Created, 400 Bad Request (e.g., circular dependency), 404 Not Found

**Error Cases:**
- `400 Bad Request` — Circular dependency detected
- `404 Not Found` — Blocker item does not exist
- `400 Bad Request` — Cannot depend on self

---

### Remove Dependency

```
DELETE /api/work-items/{id}/dependencies/{blockerItemId}
```

**Path Parameters:**
- `id: string` — Work item ID (the blocked item)
- `blockerItemId: string` — ID of blocker to remove

**Response:** `204 No Content`  
**Status Codes:** 204 No Content, 404 Not Found

---

### Get Dependencies

```
GET /api/work-items/{id}/dependencies
```

**Path Parameters:**
- `id: string` — Work item ID

**Query Parameters:**
- `direction?: 'blocked-by' | 'blocks'` — Return only incoming or outgoing dependencies (default: both)

**Response:** `DependenciesResponse`
```typescript
{
  data: DependencyLink[]
}
```

Where `DependencyLink`:
```typescript
{
  id: string;
  blockerItemId: string;
  blockerItemType: WorkItemType;
  blockerTitle: string;
  blockerStatus: WorkItemStatus;
  createdAt: string;
}
```

**Status Codes:** 200 OK, 404 Not Found

---

### Check Dependency Ready

```
GET /api/work-items/{id}/ready
```

**Path Parameters:**
- `id: string` — Work item ID

**Response:** `DependencyReadyResponse`
```typescript
{
  ready: boolean;
  unresolvedBlockers?: DependencyLink[];  // Array of unresolved dependencies
  reason?: string;  // Human-readable explanation if not ready
}
```

**Status Codes:** 200 OK, 404 Not Found

**Logic:**
- `ready: true` if all dependencies (items in `blockedBy` array) have `status === 'completed'`
- `ready: false` if any dependency has status !== 'completed'
- `unresolvedBlockers` populated with dependencies that are not yet completed

---

### Update Dependencies (Bulk)

```
PATCH /api/work-items/{id}/dependencies
```

**Path Parameters:**
- `id: string` — Work item ID

**Request Body:** `UpdateDependenciesRequest`
```typescript
{
  blockedBy?: string[];  // Array of blocker item IDs
}
```

**Response:** `WorkItem` (updated with new `blockedBy` array)  
**Status Codes:** 200 OK, 400 Bad Request (e.g., circular dependency), 404 Not Found

**Logic:**
- Replaces entire `blockedBy` array with provided IDs
- Validates no circular dependencies
- Validates all provided IDs exist
- If any validation fails, rejects entire request (atomically)

---

## Status Transitions & Dependency Gating

### Valid Status Transitions

Work item status changes are restricted by `VALID_STATUS_TRANSITIONS`. The `pending-dependencies` status represents a blocked state:

| From Status | To Status | Allowed? | Notes |
|-------------|-----------|----------|-------|
| `proposed` | `pending-dependencies` | ✅ Yes | Automatic when dependencies added |
| `reviewing` | `pending-dependencies` | ✅ Yes | Automatic when dependencies added |
| `approved` | `pending-dependencies` | ✅ Yes | Automatic when dependencies added |
| `pending-dependencies` | `proposed` | ✅ Yes | When dependencies resolved |
| `pending-dependencies` | `approved` | ✅ Yes | When dependencies resolved |
| `pending-dependencies` | `in-progress` | ❌ No | Must resolve dependencies first |

### Dispatch Gating

The `POST /api/work-items/{id}/dispatch` endpoint enforces dependency gating:

1. **Pre-check:** If work item `hasUnresolvedBlockers === true`, return 409 Conflict
2. **Automatic Status:** If work item status is `pending-dependencies`, return 409 Conflict with reason "Dependencies must be resolved before dispatch"
3. **Cascade:** When a work item completes, automatically check dependent items and transition them from `pending-dependencies` back to `proposed` (ready for re-dispatch)

---

## Data Shapes

### WorkItem

```typescript
{
  id: string;                           // e.g. "WI-123", "BUG-456"
  docId: string;                        // Google Doc ID
  title: string;
  description: string;
  type: WorkItemType;                   // 'feature' | 'bug' | 'issue' | 'improvement'
  status: WorkItemStatus;               // See enum
  priority: WorkItemPriority;           // 'critical' | 'high' | 'medium' | 'low'
  source: WorkItemSource;               // 'browser' | 'zendesk' | 'manual' | 'automated'
  complexity?: WorkItemComplexity;      // 'trivial' | 'small' | 'medium' | 'large' | 'complex'
  route?: WorkItemRoute;                // 'fast-track' | 'full-review'
  assignedTeam?: string;                // Team name
  changeHistory: ChangeHistoryEntry[];  // All state changes
  assessments: AssessmentRecord[];      // All assessments
  blockedBy?: DependencyLink[];         // Items this work item depends on
  blocks?: DependencyLink[];            // Items that depend on this work item
  hasUnresolvedBlockers?: boolean;      // Convenience flag: true if any blocker is not completed
  createdAt: string;                    // ISO 8601 timestamp
  updatedAt: string;                    // ISO 8601 timestamp
  deleted?: boolean;                    // Soft delete flag
}
```

### DependencyLink

```typescript
{
  id: string;                    // Unique dependency relationship ID
  blockerItemId: string;         // ID of blocker item
  blockerItemType: WorkItemType; // Type of blocker ('feature', 'bug', etc.)
  blockerTitle: string;          // Title of blocker (for UI display)
  blockerStatus: WorkItemStatus; // Current status of blocker
  createdAt: string;             // ISO 8601 timestamp
}
```

---

## Error Handling

All error responses follow the `ApiErrorResponse` shape:

```typescript
{
  error: string;           // Human-readable error message
  code?: string;           // Error code (e.g. "CIRCULAR_DEPENDENCY", "NOT_FOUND")
  details?: unknown;       // Additional context (e.g. validation errors)
}
```

### Common Error Codes

| Code | Status | Scenario |
|------|--------|----------|
| `CIRCULAR_DEPENDENCY` | 400 | Dependency would create a cycle |
| `INVALID_STATUS_TRANSITION` | 409 | Status change not allowed by workflow |
| `UNRESOLVED_BLOCKERS` | 409 | Cannot dispatch/approve with unresolved dependencies |
| `NOT_FOUND` | 404 | Work item or dependency not found |
| `VALIDATION_ERROR` | 400 | Invalid request payload |

---

## Type Imports

Both backend and frontend import shared types from `@shared/types/workflow`:

```typescript
import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  DependencyLink,
  AddDependencyRequest,
  DependencyReadyResponse,
  // ... other types
} from '@shared/types/workflow';
```

**Backend path:** `Source/Backend/src/types.ts` → `../../../Shared/types/workflow`  
**Frontend path:** `Source/Frontend/src/types.ts` → `../../../Shared/types/workflow`

---

## Traceability

- Dependency feature: `FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-dispatch-gating`
- Workflow feature: `FR-WF-001` through `FR-WF-006`

See `Specifications/workflow-engine.md` and `Plans/dependency-linking/requirements.md` for full requirements.
