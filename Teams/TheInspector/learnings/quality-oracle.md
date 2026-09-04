# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-09-04

### Project Architecture at a Glance

Two separate product codebases live in this repo:

| Codebase | Directory | Domain Spec | Plan Requirements | FR Namespace |
|----------|-----------|-------------|------------------|-------------|
| **Workflow Engine** (active) | `Source/` | `Specifications/workflow-engine.md` (narrative, no FR IDs) | `Plans/self-judging-workflow/requirements.md` | `FR-WF-001..013`, `FR-dependency-*` |
| **Dev Workflow Platform** (older) | `portal/` | `Specifications/dev-workflow-platform.md` | _(none in Plans/)_ | `FR-001..FR-069`, `FR-dependency-*` |

This split is critical context: when reading Verifies comments, `FR-WF-*` means Source/, `FR-001` means portal/.

### Traceability Enforcer Scope

The enforcer (`tools/traceability-enforcer.py`) auto-selects the most-recently-modified plan:
- Currently resolves to: `Plans/self-judging-workflow/requirements.md`
- Covers: `FR-WF-001..013` in `Source/` only
- **Does NOT cover** `portal/` or `Specifications/dev-workflow-platform.md` FRs
- Run with `--file` flag to target a specific requirements file

### Key File Paths for Faster Future Audits

- Traceability enforcer: `tools/traceability-enforcer.py`
- Stale drift report: `spec-drift-report.json` (root — references removed FR-TMP-* IDs, DO NOT TRUST)
- Source metrics: `Source/Backend/src/metrics.ts`
- Duplicate logger: `Source/Backend/src/logger.ts` (shim) + `Source/Backend/src/utils/logger.ts` (canonical)
- Architecture: All route handlers (`Source/Backend/src/routes/*.ts`) import store directly — P2 violation

### Spec Coverage Trend

| Scope | Run 1 (2026-09-04) |
|-------|-------------------|
| Source/ plan FRs (FR-WF-001..013) | **100%** — enforcer PASSED |
| portal/ domain FRs (FR-001..069) | ~24% (not enforced) |
| workflow-engine.md narrative spec | N/A (no FR IDs to measure) |

### Common Pattern Violations Found

1. Route handlers directly import `workItemStore` (bypasses service layer) — 3 files affected
2. `eslint-disable-next-line react-hooks/exhaustive-deps` in 2 frontend hooks/components
3. Missing `dependencyCheckDuration` Histogram metric (FR-dependency-metrics requires 4 metrics; only 3 counters exist)
4. Duplicate logger wrapper (`logger.ts` vs `utils/logger.ts`) — workaround for agent import-path divergence

### Grade History

| Date | Grade | P1 | P2 | P3 | Notes |
|------|-------|----|----|----|----|
| 2026-09-04 | B | 0 | 5 | 3 | First audit |
