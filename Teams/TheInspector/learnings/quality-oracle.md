# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-10-04

### Spec Coverage Trend

**Overall: 14%** (13 of 92 requirements in Specifications/ implemented)

| Spec | Requirements | Implemented | % |
|------|-------------|-------------|---|
| workflow-engine.md | 13 | 13 | 100% |
| dev-workflow-platform.md | 69 | 0 | 0% |
| tiered-merge-pipeline.md | 10 | 0 | 0% |

**Grade: D** (P1 open findings > 0)

---

## Key Discoveries (Faster Future Audits)

### Traceability Enforcer Scope
- **`tools/traceability-enforcer.py`** only scans `Plans/*/requirements.md` (auto-selects most recently modified). It does NOT scan `Specifications/` at all.
- FR IDs in Specifications/ are completely invisible to the enforcer.
- Run the enforcer but **also** manually grep `Specifications/` for FR-* IDs and cross-reference against Source/

### FR ID Namespaces In Use
| Namespace | Source | Status |
|-----------|--------|--------|
| `FR-001` – `FR-069` | Specifications/dev-workflow-platform.md | **Unimplemented** |
| `FR-WF-001` – `FR-WF-013` | Plans/self-judging-workflow/requirements.md | **Implemented** |
| `FR-TMP-001` – `FR-TMP-010` | Specifications/tiered-merge-pipeline.md | **Unimplemented** |
| `FR-dependency-*` | No spec — free-form | **Implemented (scope creep)** |

### Logger Architecture
- `Source/Backend/src/logger.ts` — compatibility shim (default export), wraps `src/utils/logger`
- `Source/Backend/src/utils/logger.ts` — real implementation (named export `logger`)
- All routes and most services import from `src/logger.ts`; `workItemStore.ts` imports from `src/utils/logger` directly
- This split is fragile and should be consolidated

### App Routes Registered (as of 2026-10-04)
```
/api/work-items   → workItemsRouter
/api/work-items   → workflowRouter  (mounted at same path for workflow actions)
/api/dashboard    → dashboardRouter
/api/intake       → intakeRouter
```
- **No search route registered** — `tests/routes/search.test.ts` exists but the route is not in app.ts

### Dependency Feature
- Located in `Source/Backend/src/services/dependency.ts` (315 lines)
- Frontend: `DependencyPicker.tsx`, `DependencySection.tsx`, `BlockedBadge.tsx`
- Tests: `tests/routes/dependencies.test.ts`, `tests/services/dependency.test.ts`, `tests/services/types.test.ts`
- **Has no spec entry in any Specifications/ file** — uses free-form IDs

### Clean Patterns (No Action Needed)
- No `console.log` in production source — logger abstraction is consistently used
- No hardcoded secrets or credentials
- No empty catch blocks
- No skipped or todo tests
- No files over 500 lines (largest: workflow.ts at 374 lines)
- All test files have `// Verifies:` comments

---

## Open P1/P2 Findings (For Re-Verification Next Run)

| ID | Finding | File |
|----|---------|------|
| QO-001 | Traceability enforcer is spec-blind | tools/traceability-enforcer.py |
| QO-002 | 69 requirements in dev-workflow-platform.md unimplemented | Specifications/dev-workflow-platform.md |
| QO-003 | 10 requirements in tiered-merge-pipeline.md unimplemented | Specifications/tiered-merge-pipeline.md |
| QO-004 | Dependency feature has no spec | Source/Backend/src/services/dependency.ts |
| QO-005 | Search route tested but not in app.ts | Source/Backend/tests/routes/search.test.ts |
