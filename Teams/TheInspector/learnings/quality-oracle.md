# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-01 — Full Audit

### Spec Coverage Summary

| Scope | Requirements | Covered | % |
|-------|-------------|---------|---|
| Traceability enforcer scope (`Plans/self-judging-workflow/requirements.md`) | 13 FR-WF-* | 13 | 100% |
| `FR-dependency-*` (Specifications/dev-workflow-platform.md) | 16 | 16 referenced (gaps below) | ~85% |
| FR-001 to FR-069 (dev-workflow-platform.md platform spec) | 69 | 0 in Source/ | 0% |
| FR-TMP-001 to FR-TMP-010 (tiered-merge-pipeline.md) | 10 | 0 in Source/ | 0% |
| **Full Specifications/ scope** | **108** | **29** | **~27%** |

**Key context:** The 0% for FR-001–FR-069 and FR-TMP-* is likely intentional scope exclusion — `dev-workflow-platform.md` describes the outer dev-crew orchestration system (not Source/), and tiered-merge-pipeline.md targets `platform/`. However this is undocumented and the traceability enforcer has a 12% blind spot.

### Critical Path Files for Future Audits

| Path | Relevance |
|------|-----------|
| `Plans/self-judging-workflow/requirements.md` | What the traceability enforcer actually checks |
| `Specifications/dev-workflow-platform.md` | FR-001–FR-069 + FR-dependency-* (large, complex spec) |
| `Specifications/workflow-engine.md` | Narrative spec for what's in Source/ (no FR IDs) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–FR-TMP-010 (orchestrator scope) |
| `Source/Backend/src/app.ts` | Route registration — check here for missing endpoint wiring |
| `Source/Backend/tests/routes/search.test.ts` | Documents known gap: /api/search not wired |
| `Source/Shared/types/workflow.ts` | All shared types — `WorkItemStatus` enum is canonical |

### Common Pattern Violations Found

1. **Route handlers call the store directly** — `workItems.ts`, `workflow.ts`, `intake.ts` all bypass the service layer. CLAUDE.md says "no direct DB calls from route handlers — use the service layer."

2. **Spec-naming mismatch** — Source code references `FR-dependency-*` from `dev-workflow-platform.md` (written for `portal/`), but those requirements describe a SQLite-backed system. The actual implementation uses in-memory store. Tests relabeled to "verify" schema requirements while testing a different storage model.

3. **`pending_dependencies` status ghost** — `workflow.ts` has a traceability comment claiming `FR-dependency-dispatch-gating` support for `pending_dependencies`, but `WorkItemStatus` enum has no such value. The dispatch gating returns 400 errors rather than setting a status.

4. **eslint-disable in frontend hooks** — `DependencyPicker.tsx` and `useWorkItems.ts` disable the `react-hooks/exhaustive-deps` rule, which is a common source of stale-closure bugs.

### Improving Spec Coverage Trend

- The traceability enforcer passes at 100% for its 13-requirement scope (FR-WF-*)
- FR-dependency-* features were added outside the enforcer's scope — enforcer should be extended
- The biggest actionable gap is FR-dependency-search: `/api/search` route is not registered in app.ts, breaking the DependencyPicker UI feature

### Useful Grep Patterns

```bash
# All unique FR IDs in specs
grep -rhP "FR-[A-Za-z0-9-]+" Specifications/ -o | sort -u

# All unique FR IDs in source
grep -rhP "FR-[A-Za-z0-9-]+" Source/ -o | sort -u

# Find spec IDs that appear in specs but not source (gap analysis)
# comm -23 <(grep -rhP "FR-[A-Za-z0-9-]+" Specifications/ -o | sort -u) <(grep -rhP "FR-[A-Za-z0-9-]+" Source/ -o | sort -u)

# Files missing traceability comments
grep -rL "Verifies:" Source/Backend/src/ --include="*.ts"

# Direct store calls from routes
grep -rn "store\." Source/Backend/src/routes/ --include="*.ts"
```
