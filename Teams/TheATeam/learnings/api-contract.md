# API Contract Agent Learnings

**Last Updated:** 2026-04-14  
**Agent:** API Contract  
**Team:** TheATeam

## Project API Conventions

### Type System
- **Location:** `Source/Shared/types/workflow.ts` is the single source of truth for all shared types
- **No additional type files:** All new types go into this single file. Do NOT create `Source/Shared/types/*.ts` files.
- **Import alias:** Both backend and frontend use `@shared/types/workflow`
- **Exports:** Use `export interface` for object shapes, `export enum` for constants, `export const` for immutable data

### Naming Conventions

**Enums:**
- PascalCase enum name: `WorkItemStatus`, `DependencyStatus`
- Lowercase string values: `'backlog'`, `'pending-dependencies'`, `'critical'`
- Multi-word enum values use hyphens: `'pending-dependencies'`, `'in-progress'`, `'fast-track'`

**Interfaces:**
- PascalCase: `WorkItem`, `DependencyLink`, `AddDependencyRequest`
- Request types suffix `Request`: `CreateWorkItemRequest`, `AddDependencyRequest`
- Response types suffix `Response`: `DependencyReadyResponse`, `PaginatedWorkItemsResponse`
- Simple data wrappers: `DataResponse<T>`, `PaginatedResponse<T>`

**Properties:**
- camelCase for all properties: `blockedBy`, `hasUnresolvedBlockers`, `blockerItemId`
- Optional properties use `?:` not `| undefined`

### API Response Patterns

All endpoints follow standard shapes:

1. **Paginated lists:** `{ data: T[], page, limit, total, totalPages }`
   - Import/export: `PaginatedWorkItemsResponse`, `PaginatedResponse<T>`
   - Use for: `GET /api/work-items` (with filters)

2. **Simple lists:** `{ data: T[] }`
   - Import/export: `DependenciesResponse`, `DataResponse<T>`
   - Use for: `GET /api/work-items/{id}/dependencies`

3. **Single item:** Return `T` directly (no wrapper)
   - Use for: `GET /api/work-items/{id}`, `POST /api/work-items` (created item)
   - Type: `WorkItem` (not wrapped)

4. **Delete:** `204 No Content` (no response body)
   - Use for: `DELETE /api/work-items/{id}`

5. **Errors:** `{ error: string, code?: string, details?: unknown }`
   - Import/export: `ApiErrorResponse`
   - Always include human-readable `error` message
   - Optional `code` for programmatic handling: `'CIRCULAR_DEPENDENCY'`, `'UNRESOLVED_BLOCKERS'`

### Key Types to Know

#### WorkItem (Core Entity)
- Contains: id, title, description, type, status, priority, source, complexity, route, assignedTeam
- Dependencies: `blockedBy?: DependencyLink[]`, `blocks?: DependencyLink[]`, `hasUnresolvedBlockers?: boolean`
- History: `changeHistory: ChangeHistoryEntry[]`, `assessments: AssessmentRecord[]`
- Immutable: `createdAt`, `updatedAt`, `docId`, `deleted?`

#### DependencyLink
- Represents one dependency relationship
- Fields: `id`, `blockerItemId`, `blockerItemType`, `blockerTitle`, `blockerStatus`, `createdAt`
- Used in: `WorkItem.blockedBy[]`, `WorkItem.blocks[]`, dependency responses

#### Request Types
- `CreateWorkItemRequest`: title, description, type, priority, source, (optional complexity, fastTrack)
- `UpdateWorkItemRequest`: optional fields for title, description, type, priority, complexity
- `AddDependencyRequest`: { blockerItemId: string }
- `UpdateDependenciesRequest`: { blockedBy?: string[] } — bulk replace
- `ApproveWorkItemRequest`: { reason?: string }
- `RejectWorkItemRequest`: { reason: string } — required

#### Response Types
- `DependencyReadyResponse`: { ready: boolean, unresolvedBlockers?: DependencyLink[], reason?: string }
- `DashboardSummaryResponse`: status/team/priority counts
- `QueueGroup`: { status, count, items }

### Status Transitions & Dependency Gating

#### PendingDependencies Status
- New status (added for dependency tracking)
- Represents: Work item is blocked by unresolved dependencies
- Reachable from: `proposed`, `reviewing`, `approved` (automatic when dependency added)
- Transitions to: `proposed`, `approved` (when dependencies resolved)
- Blocks: Cannot transition to `in-progress` from this status

#### Dispatch Gating
- Before dispatch (POST /api/work-items/{id}/dispatch):
  1. Check `hasUnresolvedBlockers === true` → 409 Conflict
  2. Check `status === 'pending-dependencies'` → 409 Conflict with "Dependencies must be resolved"
- After work item completes: Automatically transition dependent items from `pending-dependencies` back to their previous state (e.g., `proposed`)

### Common Mistakes to Avoid

1. **Adding new types outside workflow.ts** — All shared types go in the single file
2. **Using `type` for object shapes** — Use `interface` instead
3. **Creating type aliases** — Use interfaces with `export interface`
4. **Returning error responses as successful payloads** — Always use ApiErrorResponse for errors
5. **Forgetting the `data` wrapper on lists** — All list endpoints use `{data: T[]}`
6. **Status transitions without checking VALID_STATUS_TRANSITIONS** — Always validate before allowing status change
7. **Allowing dispatch with unresolved blockers** — Always check dependencies before dispatch
8. **Missing verifies comments** — Add `// Verifies: FR-XXX` above new types and endpoints

### Observability Notes

- Log all dependency operations: add, remove, circular detection
- Metrics: dependency cycle detection, dispatch gating events, ready-check duration
- Structured logging only (never console.log)
- Include trace IDs in dependency operation logs

### Document Structure

**Contracts file:** `Source/Shared/api-contracts.md`
- One section per endpoint
- HTTP method + path
- Query/path parameters
- Request body type (with TypeScript shape)
- Response type
- Status codes
- Error cases and codes
- Logic notes (e.g., dispatch gating)

---

## Run Notes

### 2026-04-14 — Initial API Contract Generation

**Task:** Generate shared API types and contracts for dependency tracking feature

**Actions Taken:**
1. Updated `Source/Shared/types/workflow.ts`:
   - Added `PendingDependencies` status to `WorkItemStatus` enum
   - Added `DependencyLink` interface with `id, blockerItemId, blockerItemType, blockerTitle, blockerStatus, createdAt`
   - Updated `WorkItem` interface: added `blockedBy?, blocks?, hasUnresolvedBlockers?` fields
   - Added `AddDependencyRequest`: { blockerItemId: string }
   - Added `UpdateDependenciesRequest`: { blockedBy?: string[] }
   - Added `DependenciesResponse`, `DependencyReadyResponse`, `ApiErrorResponse`
   - Updated `VALID_STATUS_TRANSITIONS`: added PendingDependencies transitions

2. Created `Source/Shared/api-contracts.md`:
   - Full endpoint documentation for work items (CRUD, route, assess, approve, reject, dispatch)
   - Full endpoint documentation for dependencies (add, remove, get, check ready, bulk update)
   - Standard response patterns
   - Status transitions table
   - Dispatch gating logic
   - Error codes and handling
   - Data shape reference

3. Coordinated with feature implementation in `portal/` directory:
   - Feature already fully implemented in portal
   - Types defined in `portal/Shared/types.ts`, database schema in `portal/Backend/src/database/schema.ts`
   - Service logic in `portal/Backend/src/services/dependencyService.ts`
   - Frontend components in `portal/Frontend/src/components/shared/`
   - Tests in `portal/Backend/tests/` and `portal/Frontend/tests/`

**Key Design Decisions:**
- Chose `blockedBy` and `blocks` as bidirectional relationship fields (for UI convenience)
- `hasUnresolvedBlockers` as convenience boolean flag (avoids repeated filtering in UI)
- `ready` endpoint returns response object (not boolean) to include context: unresolvedBlockers array, reason message
- Dispatch gating at status transition level: prevent `pending-dependencies` → `in-progress` transition entirely
- Cascade resolution: when work item completes, dependent items automatically move from `pending-dependencies` back to previous state

**Files Modified:**
- `Source/Shared/types/workflow.ts` — Added types for dependencies
- `Source/Shared/api-contracts.md` — Created, full contracts documentation

**Test Coverage:**
- No new tests in Source layer (this is types/contracts generation)
- Existing tests in portal verify implementation

**Traceability:**
- All new types marked with `// Verifies: FR-dependency-linking` or `FR-dependency-ready-check`
- All transitions marked with `// Verifies: FR-dependency-dispatch-gating`
