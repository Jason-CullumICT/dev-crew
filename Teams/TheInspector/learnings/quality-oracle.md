# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-04 — Full Audit

### Spec Coverage Summary

| Spec File | Total FRs | Traced in Source | Notes |
|-----------|-----------|-----------------|-------|
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-*) | 13/13 ✅ | Enforcer passes |
| `Specifications/dev-workflow-platform.md` | 17 (FR-dependency-*) | 17/17 ✅ (but search route not wired) | Manual check required |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-*) | 9/10 ⚠️ | FR-TMP-008 untraced |
| **Total** | **40** | **38-39/40** | **~97% traceability** |

**Overall Grade: C** (1 P1, 3 P2 findings)

---

## Key Discoveries

### Critical Paths for Future Audits

- **app.ts** is the canonical route registration file — check here first for missing endpoint registrations
- **store/workItemStore.ts** is the in-memory data layer; routes import it directly (architecture tension with CLAUDE.md "no direct DB calls from route handlers")
- Two logger abstractions co-exist:
  - `src/utils/logger.ts` — canonical implementation (named export `logger`)
  - `src/logger.ts` — compatibility shim (default export, used by routes/services)
- Traceability enforcer targets `Plans/self-judging-workflow/requirements.md` only (most recently modified)

### Enforcer Blind Spots (do not auto-check)
- `Specifications/tiered-merge-pipeline.md` → FR-TMP-* → implemented in `platform/orchestrator/lib/workflow-engine.js`
- `Specifications/dev-workflow-platform.md` → FR-dependency-* → implemented in `Source/Backend` and `Source/Frontend`

### Spec Drift Pattern
- `Specifications/dev-workflow-platform.md` still references **portal/** paths (`portal/Shared/types.ts`, `portal/Backend schema`, `portal/Frontend/tests/`) — these are the OLD portal app
- The dependency feature was re-implemented in **Source/** but the spec was not updated to reflect new paths
- The `portal/` directory is a separate application (`portal/Backend/src/services/dependencyService.ts` etc.)

### Duplicate Test Files
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- `Source/Frontend/tests/WorkItemListPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`
- The `pages/` versions are newer and more complete (use `within()`, import specific types)
- Likely created by different pipeline coders — needs consolidation

### Common Pattern Violations Found
- Direct store calls from route handlers (3 route files)
- 2 × eslint-disable-react-hooks/exhaustive-deps (DependencyPicker.tsx:82, useWorkItems.ts:63)
- No console.log in production source ✅
- No hardcoded secrets ✅
- No disabled tests ✅
- No empty catch blocks (the `.catch(() => ({}))` in client.ts is intentional error body fallback) ✅

---

## Findings Reference (P1/P2 for re-verification next run)

### [OPEN] P1: GET /api/search endpoint missing from app.ts
- **File:** `Source/Backend/src/app.ts` (no `/api/search` route)
- **Evidence:** `Source/Backend/tests/routes/search.test.ts:3-6` explicitly documents this gap
- **Impact:** DependencyPicker search feature broken at runtime

### [OPEN] P2-1: Routes bypass service layer
- **Files:** `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`
- `import * as store from '../store/workItemStore'` directly in route handlers
- **Rule:** CLAUDE.md "No direct DB calls from route handlers -- use the service layer"

### [OPEN] P2-2: Traceability enforcer scope too narrow
- **File:** `tools/traceability-enforcer.py`
- Only checks most-recently-modified `Plans/*/requirements.md` file
- Misses FR-TMP-* and FR-dependency-* specs entirely

### [OPEN] P2-3: FR-TMP-008 untraced
- **Spec:** `Specifications/tiered-merge-pipeline.md` — "Worker Container Prerequisites"
- 0 references in platform/, tools/, or Source/

### [OPEN] P3-1: Spec drift — portal/ paths in dev-workflow-platform.md
- **File:** `Specifications/dev-workflow-platform.md:467-482`
- References portal/Shared, portal/Backend, portal/Frontend — old implementation paths
