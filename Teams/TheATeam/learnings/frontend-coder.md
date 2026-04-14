# Frontend Coder Learnings

## Environment

- Working directory for tests: `Source/Frontend/`
- Run tests: `cd Source/Frontend && npx vitest run`
- Install deps first if vitest not found: `cd Source/Frontend && npm install && npx vitest run`
- Traceability enforcer: `cd /home/runner/work/dev-crew/dev-crew && python3 tools/traceability-enforcer.py`

## Import Path Convention

**Critical:** Shared types import path depends on test file depth:
- `tests/` (root level) → `../../Shared/types/workflow`
- `tests/pages/` or `tests/components/` (one level deep) → `../../../Shared/types/workflow`
- NOT `../../../../` — that goes up too far

The `@shared` alias exists in `vite.config.ts` but use relative paths in tests.

## Module Patterns

### API Client (`src/api/client.ts`)
- All API functions are grouped in named export objects: `workItemsApi`, `dashboardApi`, `dependenciesApi`
- Uses a generic `request<T>()` helper with 204 no-content handling
- Import shared types and use them for request/response types

### Components
- Use inline `style={{ ... }}` objects — NO Tailwind, NO CSS modules
- Colors: nav bg `#1f2937`, active link `#60a5fa`, body bg `#f9fafb`
- Test IDs: always `data-testid="..."` for meaningful UI elements

### Tests
- Mock `react-router-dom` to capture `useNavigate` calls: `vi.mock('react-router-dom', async () => { const actual = ...; return { ...actual, useNavigate: () => mockNavigate } })`
- Mock `../src/api/client` with all methods as `vi.fn()`
- Always include `dashboardApi` in the client mock even when not testing it
- Use `within()` from `@testing-library/react` for scoped queries inside test IDs

## Dependency Tracking Feature (2026-04-14)

### Shared Types
`Source/Shared/types/workflow.ts` already has:
- `DependencyLink` interface with `blockerItemId`, `blockerItemType`, `blockerTitle`, `blockerStatus`, `createdAt`
- `WorkItem.blockedBy?: DependencyLink[]` — items that block this one
- `WorkItem.blocks?: DependencyLink[]` — items this one blocks  
- `WorkItem.hasUnresolvedBlockers?: boolean`
- `WorkItemStatus.PendingDependencies = 'pending-dependencies'`
- `AddDependencyRequest`, `DependenciesResponse`, `DependencyReadyResponse`

### Components Created
- `src/components/BlockedBadge.tsx` — inline badge for list views; shows "Blocked" (red) and/or "Pending Dependencies" (amber)
- `src/components/DependenciesPanel.tsx` — section with "Blocked By" and "Blocks" chip lists; chips navigate to `/work-items/:blockerItemId`

### Pages Updated
- `WorkItemDetailPage` — shows DependenciesPanel when blockedBy/blocks non-empty; dispatch button disabled+warning when `hasUnresolvedBlockers`
- `WorkItemListPage` — BlockedBadge rendered in Status column per row
- `StatusBadge` — added `PendingDependencies` amber color `#d97706`

### API Client
- Added `dependenciesApi` with `addDependency`, `removeDependency`, `checkReady`
- Routes: `POST /work-items/:id/dependencies`, `DELETE /work-items/:id/dependencies/:blockerId`, `GET /work-items/:id/ready`

### Test Files Written
- `tests/components/DependenciesPanel.test.tsx` (12 tests)
- `tests/components/BlockedBadge.test.tsx` (6 tests)
- `tests/pages/WorkItemDetailDependencies.test.tsx` (9 tests)
- `tests/pages/WorkItemListDependencies.test.tsx` (4 tests)

### FR Traceability
- `FR-dependency-linking` — DependencyLink types, DependenciesPanel, API client
- `FR-dependency-ready-check` — BlockedBadge component, checkReady API
- `FR-dependency-dispatch-gating` — dispatch disabled when hasUnresolvedBlockers, PendingDependencies status

## Common Pitfalls

1. **Never use `--passWithNoTests`**
2. **Wrong import depth** — always count relative levels carefully for `Shared/` imports
3. **WorkItemListPage mock** — must include ALL api methods (list, getById, create, route, assess, approve, reject, dispatch) in the vi.mock
4. **BlockedBadge** renders `null` fragment when neither condition met — tests must use `queryByTestId` for absence checks
5. **DependenciesPanel** only shown in detail page when blockedBy OR blocks arrays are non-empty — uses conditional rendering
