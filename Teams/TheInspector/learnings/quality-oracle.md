# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run History

| Date | Grade | P1 | P2 | P3 | P4 | Coverage (Source) |
|------|-------|----|----|----|----|-------------------|
| 2026-04-29 | C | 1 | 6 | 3 | 2 | 96% |

---

## Learnings

### Project Architecture (multi-app layout)

This repo hosts **three separate applications** — they share Specifications/ but have different codebases:

| App | Directory | Spec | Requirements Format |
|-----|-----------|------|---------------------|
| Workflow Engine (Source App) | `Source/` | `Specifications/workflow-engine.md` | FR-WF-001..013 in `Plans/self-judging-workflow/requirements.md` |
| Dev Workflow Platform (Portal) | `portal/` | `Specifications/dev-workflow-platform.md` | FR-001..069 + FR-dependency-* |
| Orchestrator / Pipeline | `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001..010 |

**Do not** treat 0% coverage of FR-001..069 or FR-TMP-* in `Source/` as rot — they target different directories.

### Traceability Enforcer Scope

- Enforcer: `python3 tools/traceability-enforcer.py`
- Targets: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) only
- FR-dependency-* in Source/: Verified by `// Verifies:` comments only, NOT enforced by tool
- Portal/platform requirements: NOT checked at all
- **Gap to fix:** Add enforcer run for `Plans/dependency-linking/requirements.md`

### Key Source Files for Fast Audit

| File | Covers |
|------|--------|
| `Source/Backend/src/app.ts` | Route registration — check for missing routes |
| `Source/Backend/src/metrics.ts` | All Prometheus metrics — check completeness vs spec |
| `Source/Shared/types/workflow.ts` | WorkItemStatus enum, VALID_STATUS_TRANSITIONS |
| `Source/Backend/src/services/dependency.ts` | FR-dependency-* implementation |
| `portal/Shared/api.ts` | Portal API types — check for missing fields |
| `portal/Backend/src/database/` | Check for seed.ts (currently missing) |

### Known Open Items (first audit — track for re-verification)

| ID | Item | Status |
|----|------|--------|
| QO-001 | `GET /api/search` not wired in app.ts | OPEN P1 |
| QO-002 | OTel tracing absent from Source/Backend | OPEN P2 |
| QO-003 | `dependencyCheckDuration` histogram missing | OPEN P2 |
| QO-004 | Portal `UpdateBugInput.blocked_by` missing | OPEN P2 |
| QO-005 | Portal `seed.ts` not created | OPEN P2 |
| QO-006 | Portal `DependencySection.test.tsx` + `BlockedBadge.test.tsx` missing | OPEN P2 |
| QO-007 | `pending_dependencies` status not in WorkItemStatus | OPEN P2 |
| QO-012 | Portal DependencyPicker `// Verifies: FR-0001` wrong ID | OPEN P4 |

### Pattern Checks Worth Running Every Audit

```bash
# 1. Route registration completeness
cat Source/Backend/src/app.ts

# 2. Metrics completeness vs spec
cat Source/Backend/src/metrics.ts

# 3. OTel import presence
grep -rn "opentelemetry" Source/Backend/src/

# 4. Portal API types (missing blocked_by)
grep -A8 "UpdateBugInput\|UpdateFeatureRequestInput" portal/Shared/api.ts

# 5. Portal seed file
ls portal/Backend/src/database/

# 6. Console.log in production
grep -rn "console\.log\|console\.error" Source/ --include="*.ts" --include="*.tsx" | grep -v ".test."

# 7. Empty catch blocks
grep -rn "catch.*{$" Source/Backend/src/ | head -20

# 8. Traceability enforcer
python3 tools/traceability-enforcer.py
```

### Spec Coverage Trend

| Date | Source Coverage | Portal Open Items | Grade |
|------|----------------|-------------------|-------|
| 2026-04-29 | 96% | 3 open | C |
