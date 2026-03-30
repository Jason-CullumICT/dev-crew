# Frontend Coder Learnings

## 2026-03-30 — Duplicate/Deprecated Status Feature (FR-0008)

- The Backend tsconfig.json has a pre-existing rootDir/include mismatch (`rootDir: ./src` but includes `../Shared/**/*`), so `tsc --noEmit` from the Backend dir will always fail with TS6059. This is not caused by frontend changes.
- Frontend components use inline style objects (no CSS modules) — follow this pattern for new components.
- All portal files were deleted from git working tree before this task started; needed `git checkout HEAD -- portal/` to restore them.
- The `DependencyItemType` is `'bug' | 'feature_request'` (with underscore), while API routes use `bugs` and `feature-requests` (hyphen). The `itemTypeToRoute()` helper in api.ts handles the mapping.
- Existing list components used a simple `useEffect` with no dependencies to fetch once. For the showHidden toggle, switched to `useCallback` + `useEffect` pattern so re-fetch triggers on state change.
- Status badge styling follows a switch-case pattern in each component — added `duplicate` (amber) and `deprecated` (grey) cases.
