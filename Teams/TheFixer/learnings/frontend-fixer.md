# Frontend Fixer Learnings

## 2026-04-15 — Image Delete Ownership Fix (backend-only)

### Scope Analysis
- Fix plan tagged `backend-only`; all affected files were in `portal/Backend/`
- `Source/Frontend/` had **zero** image-related code; no changes needed
- Always check fix-plan.md scope tags before diving into code searches

### Wiring Audit (Source/Frontend baseline)
All 5 pages properly routed in `App.tsx`:
- `/` → DashboardPage
- `/work-items` → WorkItemListPage
- `/work-items/new` → CreateWorkItemPage
- `/work-items/:id` → WorkItemDetailPage
- `/debug` → DebugPortalPage

All 7 shared components (`BlockedBadge`, `DependencyPicker`, `DependencySection`, `Layout`, `PriorityBadge`, `StatusBadge`, `TypeBadge`) are consumed in pages — no orphans.

### Test Baseline
- 12 test files, 135 tests, all passing
- npm install required before `npx vitest run` (dependencies not pre-installed in CI)
- Vitest fails with ERR_MODULE_NOT_FOUND if `node_modules` is absent — run `npm install` in `Source/Frontend/` first

### Notes
- `Source/Frontend/` has no image upload/delete UI — portal uses `portal/Frontend/` for that
- `portal/` and `Source/Frontend/` are separate apps with separate package.json files
