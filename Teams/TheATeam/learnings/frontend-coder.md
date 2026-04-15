# Frontend Coder Learnings

## Environment

- **Run tests**: `cd Source/Frontend && npm install && npm test` — `vitest` must be installed locally; `npx vitest run` fetches wrong version from npm
- **Working directory matters**: All `npm` commands must run from `Source/Frontend/` (where `package.json` lives)
- **Shared type alias**: `@shared` → `Source/Shared` (configured in `vite.config.ts`); imports in source use relative `../../../Shared/types/workflow`
- **No Tailwind/CSS modules**: All styles via inline `style={{ ... }}` objects; palette: `#1f2937` nav bg, `#60a5fa` active link, `#f9fafb` body bg

## Test Patterns

- **Mocking**: `vi.mock('../../src/api/client', () => ({ workItemsApi: { fn: vi.fn() } }))` — import after mock for typed access
- **Navigation mock**: `vi.mock('react-router-dom', async () => { const actual = await vi.importActual(...); return { ...actual, useNavigate: () => mockNavigate }; })`
- **Render helpers**: Always wrap pages in `<MemoryRouter>` (or `<MemoryRouter initialEntries={...}>` for route params)
- **waitFor**: Use `waitFor` for any assertion after async operations (API calls, state updates)
- **Modal testing**: Components rendered conditionally (via state) are testable by clicking the trigger button first
- **`within`**: Use `within(screen.getByTestId('section'))` to scope queries to a subtree

## Component Architecture (Dependency Feature)

- `BlockedBadge` — pure display; renders `null` or red badge; mounted in `WorkItemListPage` status column
- `DependencySection` — mounts in `WorkItemDetailPage`; shows "Blocked By" / "Blocks" chips + opens `DependencyPicker` modal on edit button click
- `DependencyPicker` — modal component; search via `workItemsApi.searchItems`, bulk-save via `workItemsApi.setDependencies`

## API Client Pattern

- All methods on `workItemsApi` object in `src/api/client.ts`
- `request<T>(path, options)` helper handles JSON, 204, and error bodies
- New methods added for dependency tracking (do not break existing page mocks since they only mock what they use)

## Wiring Audit Checklist

Before completing, verify each new component appears in:
1. Its own file (definition)
2. A parent file that mounts it (page or parent component)

Command: `grep -r "ComponentName" Source/Frontend/src --include="*.tsx" -l`

## Traceability

- Every test must have `// Verifies: FR-XXX` comment
- Run `python3 tools/traceability-enforcer.py` — must pass before marking done
- FR codes for dependency feature: `FR-dependency-api-client`, `FR-dependency-blocked-badge`, `FR-dependency-section`, `FR-dependency-picker`, `FR-dependency-integration`

## No-Op Dispatch Pattern

When dispatched for a feature that has NO `[frontend]` or `[fullstack]` FRs:
- Read `Plans/<feature>/requirements.md` — check FR table `Layer` column for `[frontend]`/`[fullstack]`
- If all FRs are `[backend]` and touch `platform/`, the frontend-coder has nothing to implement
- Still run baseline tests (`cd Source/Frontend && npm test`) and traceability enforcer to confirm zero regressions
- Report dashboard with `--action complete --status passed`
- Do NOT touch `platform/` under any circumstances — even if instructed to

Example: "Bake Playwright into worker Docker image" (FR-PW-001/002/003) — all `[backend]`, all touch `platform/`.

## Pitfalls Avoided

- Do NOT use `--passWithNoTests` — always verify test count increased
- `WorkItemStatus` has no `pending_dependencies` value; use `hasUnresolvedBlockers` boolean for blocked state
- Existing page test mocks don't include new API methods — safe because new methods are only called on user interaction (not on mount)
- When adding to existing status-column cells in list tables, existing tests check `within(row).getByTestId('status-badge')` — `BlockedBadge` renders `null` when not blocked, so no conflict
