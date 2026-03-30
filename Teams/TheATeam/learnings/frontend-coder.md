# Frontend Coder Learnings

## Duplicate/Deprecated Tagging (2026-03-30)

- `HIDDEN_STATUSES` is exported from `portal/Shared/types.ts` and used in both BugList and FeatureRequestList for opacity styling
- The `include_hidden` param on list API calls is typed as `boolean | undefined` — pass `undefined` (not `false`) when unchecked to avoid sending the query param at all
- BugList has selectable/checkbox support that FeatureRequestList does not — keep patterns consistent but don't add features not in scope
- FeatureRequestDetail already had action buttons for duplicate/deprecated (FR-DUP-09) but was missing the top banners (FR-DUP-10) — the dispatch plan gap analysis was accurate
- The `useApi` hook takes a deps array that must include all state variables used in `fetchFn` — forgetting `showHidden` would cause stale closures
- Existing test mocks for `repos.list` and `images.list` are needed even for unrelated tests because FeatureRequestDetail calls them on mount via useEffect
- When adding new fields to shared types (e.g. `duplicate_of`, `deprecation_reason`), pre-existing test files that create mock objects of those types will fail TS checks — fix by adding the new fields to mock data or using a spread pattern with default values
- FeatureRequests.test.tsx and BugReports.test.tsx mock `../src/api/client` — any new exports used by transitively imported components (e.g. `repos` used by FeatureRequestDetail) must be added to the mock or tests crash at import time
