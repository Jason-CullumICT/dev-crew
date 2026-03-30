# Frontend Coder Learnings

## Dependency Linking Feature (2026-03-30)

### Portal Frontend Patterns
- Portal frontend uses inline styles (not CSS modules or Tailwind for shared components) — see DependencySection, DependencyPicker, BlockedBadge
- Main page components (BugReportsPage, FeatureRequestsPage) use Tailwind classes
- API client is at `portal/Frontend/src/api/client.ts` with typed wrappers around `fetch`
- Shared types at `portal/Shared/types.ts` are the single source of truth
- Update input types at `portal/Shared/api.ts` need `blocked_by?: string[]` for dependency PATCH support

### Test Mock Patterns
- When mocking `../src/api/client`, must include ALL exports that components import (e.g., `repos`, `images`, `orchestrator`) — not just the primary entity client
- `repos.list()` is called in `useEffect` by `RepoSelector` (used by BugDetail and create forms) — always mock it in tests that render these components
- Use `expect.objectContaining()` for create assertions when forms include optional fields like `target_repo`

### Traceability
- Use correct FR IDs from the dispatch plan (e.g., `FR-dependency-picker`, `FR-dependency-detail-ui`, `FR-dependency-list-ui`), not generic `FR-0001`
- Backend uses correct IDs consistently; frontend initially had wrong references

### Pre-existing Issues
- Several test files have missing mocks for `repos` export (Traceability, Learnings, ImageUpload, OrchestratorCycleCard, OrchestratorCycles)
- OrchestratorCycleCard and OrchestratorCycles tests reference modules that don't exist yet
