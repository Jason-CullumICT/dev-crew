# Frontend Coder Learnings

## Dependency Linking UI Verification (2026-03-30)

- All dependency UI components (DependencySection, BlockedBadge, DependencyPicker) were already implemented at HEAD and correctly integrated into BugDetail, BugList, FeatureRequestDetail, FeatureRequestList
- Test fixtures in 8 test files needed updating to add missing type properties: `target_repo`, `duplicate_of`, `deprecation_reason`, `duplicated_by` for FeatureRequest/BugReport; `pending_dependencies`/`duplicate`/`deprecated` for status Records; `work_item_ref`/`issue_description`/`considered_fixes` for Ticket; `feedback`/`team_name` for DevelopmentCycle; `cycle_id`/`traceability_report` for Feature
- Vitest 1.6.1 with duplicate `vi.mock()` calls for the same module: only the LAST hoisted mock wins. The Traceability test had two `vi.mock('../src/api/client')` calls — the second (for CycleView, without `repos`) overwrote the first (for BugDetail, with `repos`). Fix: merge into one mock
- Three orchestrator component stubs (CycleCard, CycleLogStream, CompletedCyclesSection) were missing — created minimal implementations to pass type-checking. The page-level integration tests for OrchestratorCyclesPage still fail because the page uses a different API shape than the tests expect
- Pre-existing test failures in ImageUpload.test.tsx (form label changes), Learnings.test.tsx (filter label changes), OrchestratorCycles.test.tsx (page API mismatch) are NOT related to dependency linking

## Duplicate/Deprecated Tagging (2026-03-30)

- `HIDDEN_STATUSES` is exported from `portal/Shared/types.ts` and used in both BugList and FeatureRequestList for opacity styling
- The `include_hidden` param on list API calls is typed as `boolean | undefined` — pass `undefined` (not `false`) when unchecked to avoid sending the query param at all
- BugList has selectable/checkbox support that FeatureRequestList does not — keep patterns consistent but don't add features not in scope
- FeatureRequestDetail already had action buttons for duplicate/deprecated (FR-DUP-09) but was missing the top banners (FR-DUP-10) — the dispatch plan gap analysis was accurate
- The `useApi` hook takes a deps array that must include all state variables used in `fetchFn` — forgetting `showHidden` would cause stale closures
- Existing test mocks for `repos.list` and `images.list` are needed even for unrelated tests because FeatureRequestDetail calls them on mount via useEffect
