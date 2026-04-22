# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Learnings

### 2026-04-22 — First Audit Run

#### Project Architecture Understanding

- **Two separate applications exist in this repo:**
  1. `Source/` — The "Self-Judging Workflow Engine" (in-memory store, Express + React, FR-WF-001 to FR-WF-013 + FR-dependency-*)
  2. `portal/` — Referred to in some specs as a separate frontend (not in Source/)
  
- **Three specs, one current implementation:**
  - `Specifications/workflow-engine.md` → implemented in `Source/` via `Plans/self-judging-workflow/requirements.md`
  - `Specifications/dev-workflow-platform.md` → NOT implemented in `Source/` (different product with SQLite, different entity model — FR-001 to FR-069)
  - `Specifications/tiered-merge-pipeline.md` → implemented in `platform/` (orchestrator-level, not Source/) via FR-TMP-001 to FR-TMP-010

- **Traceability IDs in use:**
  - `FR-WF-001` to `FR-WF-013` → `Plans/self-judging-workflow/requirements.md`
  - `FR-dependency-*` → `Plans/dependency-linking/requirements.md`
  - These are the only two plans whose FRs appear in `Source/` with `// Verifies:` comments

#### Fast-Path Heuristics

- **Check `Plans/self-judging-workflow/requirements.md` for active FR-WF-XXX IDs** — this is where the enforcer targets.
- **Check `Plans/dependency-linking/requirements.md` for FR-dependency-XXX IDs.**
- Most recently modified plan (for enforcer): `self-judging-workflow/requirements.md`
- Logger canonical path: `Source/Backend/src/utils/logger.ts` (the real one); `src/logger.ts` is a shim.

#### Recurring P2 Findings to Re-Check Each Audit

| Finding | File | What to Look For |
|---------|------|-----------------|
| Route→Store direct access | `routes/intake.ts`, `routes/workItems.ts`, `routes/workflow.ts` | `import * as store from '../store/workItemStore'` |
| Missing histogram | `src/metrics.ts` | No `Histogram` import from `prom-client` |
| OpenTelemetry absent | `src/` root | No `@opentelemetry` imports anywhere |
| pending_dependencies status | `Shared/types/workflow.ts` | `WorkItemStatus` enum missing `PendingDependencies` |

#### Useful Patterns

```bash
# All Verifies: IDs in source
grep -rh "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -oP "FR-[A-Za-z0-9-]+" | sort -u

# All FR IDs in specs
grep -oP "FR-[A-Z0-9-]+" Specifications/*.md | sort -u

# Architecture violation: direct store access from routes
grep -rn "from.*store/workItemStore" Source/Backend/src/routes/

# Missing OTel
grep -rn "@opentelemetry" Source/Backend/src/

# Suppress patterns
grep -rn "eslint-disable\|@ts-ignore\|@ts-nocheck" Source/ --include="*.ts" --include="*.tsx"
```

#### Spec Coverage Trend

| Date | Active Plan Coverage | Aggregate Coverage | Grade |
|------|---------------------|-------------------|-------|
| 2026-04-22 | 100% (13/13 FR-WF-*) | ~30% (28/89 cross-spec) | B |

#### Open P2 Findings (Track for Regression)

1. **QO-001** — Enforcer blind spot: `Specifications/` not checked by `tools/traceability-enforcer.py`
2. **QO-002** — Route handlers bypass service layer; 3 route files import `workItemStore` directly
3. **QO-003** — `dependency_check_duration` Histogram missing from `metrics.ts`
4. **QO-004** — OpenTelemetry completely absent (zero `@opentelemetry` imports)
