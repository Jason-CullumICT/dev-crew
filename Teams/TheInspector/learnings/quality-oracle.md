# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-11-20 — First full audit

### Spec Coverage Trend
- **Baseline:** 15% (12/81 Specification FRs traced)
- **Plans-level coverage:** 100% (13/13 FR-WF-* IDs from `Plans/self-judging-workflow/requirements.md`)
- **Specification-level coverage:** 0% for numeric FRs (FR-001 to FR-069); 100% for FR-dependency-*

### Key Structural Finding
The project has a two-layer requirement hierarchy:
1. **Specifications/** — `dev-workflow-platform.md` with FR-001 through FR-069 (plus FR-dependency-* entries). These are the governing domain truth documents.
2. **Plans/** — `self-judging-workflow/requirements.md` with FR-WF-001 through FR-WF-013. These are Plan-level IDs used for the actual implementation sprint.

The source code is fully traced to Plan-level IDs, NOT Specification-level IDs. The traceability-enforcer.py only checks Plan-level IDs. This creates a systemic blind spot for 69 Specification FRs.

### Critical Open Issues (carry forward)
1. **QO-001 (P1):** `GET /api/search` is NOT wired into `app.ts`. `search.test.ts` explicitly documents this gap. DependencyPicker search is broken in production. Fix: add `searchRouter` and mount at `/api/search`.
2. **QO-002 (P1):** Traceability enforcer never validates Specification FRs. Fix: extend `tools/traceability-enforcer.py` to also scan `Specifications/` for FR IDs and cross-reference with source.

### File Locations (for faster future audits)
- Main spec: `Specifications/dev-workflow-platform.md` — 81 FRs (FR-001..FR-069 + FR-dependency-*)
- Plans requirements: `Plans/self-judging-workflow/requirements.md` — 13 FR-WF-* IDs
- Traceability tool: `tools/traceability-enforcer.py` — currently checks Plans only
- Backend routes: `Source/Backend/src/routes/` — 4 files (dashboard, intake, workItems, workflow)
- Backend app entry: `Source/Backend/src/app.ts` — route registration
- Duplicate tests: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` (both active, need consolidation)
- Logger duplication: `Source/Backend/src/utils/logger.ts` (original) + `Source/Backend/src/logger.ts` (wrapper)

### Common Pattern Violations
- `eslint-disable` without justification: `useWorkItems.ts:63`, `DependencyPicker.tsx:82`
- No `console.log` violations found (clean)
- No hardcoded secrets found (clean)
- `{data: T[]}` wrapper pattern is correctly followed

### Useful Grep Patterns
```bash
# Find all Verifies comments
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"

# Find FR IDs in specs
grep -oP "FR-[A-Z0-9-]+" Specifications/ -r | sort | uniq

# Check which routes are actually mounted
grep -n "app.use" Source/Backend/src/app.ts

# Find eslint-disable in production (non-test) files
grep -rn "eslint-disable" Source/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v spec
```
