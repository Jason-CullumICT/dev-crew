# API Contract Agent Learnings

## 2026-04-14 — Dependency Tracking Feature (FR-070–FR-085)

### Shared Types Location
- **File:** `Source/Shared/types/workflow.ts`
- **Alias:** `@shared/types/workflow` in both backend and frontend via tsconfig
- **Rule:** All new shared types go in this single file — never create `Source/Shared/types/foo.ts`

### Dependency Tracking Types Added

#### New Enums
- `DependencyBlockageReason` (unresolved-dependency, waiting-for-blocker) — used for audit/logging

#### New Interfaces
- `DependencyLink`: Represents a dependency relationship with blocker/blocked item IDs and timestamps
- Extended `WorkItem` with:
  - `blockedBy?: DependencyLink[]` — items blocking this one
  - `blocks?: DependencyLink[]` — items this one blocks
  - `hasUnresolvedBlockers?: boolean` — flag for UI rendering (blocked badge)

#### New Request/Response Types
- `DependencyActionRequest` — `{action: 'add'|'remove', blockerId: string}`
- `ReadinessCheckResponse` — `{ready: boolean, unresolvedBlockers?: DependencyLink[]}`
- `ApiErrorResponse` — `{error: string, code?: string}`

#### State Machine Constants
- `RESOLVED_STATUSES` — statuses that unblock dependents: Completed, Rejected, Failed
- `DISPATCH_TRIGGER_STATUSES` — statuses that trigger auto-advance: Completed, Rejected

### Contracts Document
- **File:** `Source/Shared/api-contracts.md`
- **Format:** Markdown with endpoint sections, request/response schemas, error codes, implementation notes
- **Verifies:** Each endpoint is tied to FR IDs via comment blocks
- **Updated VALID_STATUS_TRANSITIONS:** Now includes notes about pending_dependencies blocking

### API Contract Conventions

#### Response Patterns (Verified in Project)
- **List (paginated):** `{data: T[], page, limit, total, totalPages}`
- **List (simple):** `{data: T[]}`
- **Single item:** Return `T` directly (not wrapped)
- **Delete:** `204 No Content` (no body)
- **Error:** `{error: string, code?: string}`

#### Endpoint Categories
Organize by entity type:
- POST /api/{entity}/:id/dependencies (add/remove single link)
- GET /api/{entity}/:id/ready (readiness check)
- GET /api/{entity} list (include `hasUnresolvedBlockers` flag)
- GET /api/{entity}/:id detail (include resolved `blockedBy[]` and `blocks[]`)
- PATCH /api/{entity}/:id (accept `blockedBy?: string[]`)

#### Status Transition Rules
- When transitioning to `approved` with unresolved blockers → set status to `pending_dependencies` instead (dispatch gating)
- When a blocker transitions to Completed/Rejected → auto-advance dependent from `pending_dependencies` to `approved` (cascade dispatch)
- Cycle detection required for all add-dependency operations (BFS to detect transitive cycles)

### Implementation Checklist
- [x] Extend WorkItem type with blockedBy, blocks, hasUnresolvedBlockers
- [x] Add DependencyLink and DependencyActionRequest types
- [x] Add ReadinessCheckResponse and ApiErrorResponse wrappers
- [x] Update UpdateWorkItemRequest with blockedBy?: string[]
- [x] Add RESOLVED_STATUSES and DISPATCH_TRIGGER_STATUSES constants
- [x] Create api-contracts.md with full endpoint specifications
- [x] Document response envelope patterns and error codes
- [x] Link all endpoints to FR IDs via Verifies comments

### Next Steps for Backend/Frontend Coders
1. **Backend:** Import DependencyLink, DependencyActionRequest, ReadinessCheckResponse from @shared/types/workflow
2. **Backend:** Implement dependency service with cycle detection (BFS), dispatch gating, and cascade auto-dispatch
3. **Frontend:** Use ReadinessCheckResponse to display blockage status; render BlockedBadge and DependencySection based on these types
4. **Both:** Follow error codes in ApiErrorResponse (CIRCULAR_DEPENDENCY=409, ITEM_NOT_FOUND=404, etc.)

### Naming Conventions
- Blocker/blocked terminology: "A blocks B" = "A is a blocker of B" = "B is blocked by A" = "B depends on A"
- Endpoint: POST /:id/dependencies + action enum (cleaner than separate +add/-remove endpoints)
- Status value: `pending_dependencies` (dash-separated, lowercase) — matches existing status enum pattern
