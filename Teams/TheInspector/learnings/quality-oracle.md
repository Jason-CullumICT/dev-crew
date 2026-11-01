# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-01 — Full Audit

### Spec Coverage Trend

| Spec | FRs | Covered | Coverage |
|------|-----|---------|----------|
| Plans/self-judging-workflow/requirements.md (enforcer target) | 13 | 13 | **100%** |
| Specifications/dev-workflow-platform.md (portal/) | 76 | ~73 | **~96%** |
| Specifications/tiered-merge-pipeline.md | 10 | 0 | **0%** |
| **Overall** | **99** | **~86** | **~87%** |

### Architecture: Two Parallel Source Trees

This project has **two separate implementations** sharing spec IDs:

- **`Source/`** — Self-Judging Workflow Engine (FR-WF-001 through FR-WF-013 + FR-dependency-*)
  - In-memory store, Express, own DB, owns Prometheus metrics
  - Plan: `Plans/self-judging-workflow/requirements.md`
  - Enforcer scans this tree ✅

- **`portal/`** — Dev Workflow Platform (FR-001 through FR-085, FR-dependency-*)
  - SQLite-backed, separate Express, owns its own metrics
  - Plan: `Plans/dev-workflow-platform/requirements.md` + `Plans/dependency-linking/requirements.md`
  - **Enforcer does NOT scan this tree ❌** — inspector.config.yml source.dirs only lists `Source/`

**CRITICAL**: `inspector.config.yml` `source.dirs` must add `portal/` for correct coverage measurement.

### FR-dependency-* ID Collision

The `FR-dependency-*` IDs appear in BOTH source trees:
- `portal/Backend/src/services/dependencyService.ts` implements `FR-dependency-service` for the portal
- `Source/Backend/src/services/dependency.ts` implements its own dependency service also tagged `FR-dependency-service`
This works for traceability but creates ambiguity about which implementation the spec targets.

### Key File Paths for Fast Future Audits

| Purpose | Path |
|---------|------|
| Main spec (portal) | `Specifications/dev-workflow-platform.md` |
| Workflow engine spec | `Specifications/workflow-engine.md` |
| Tiered merge pipeline spec | `Specifications/tiered-merge-pipeline.md` |
| Enforcer tool | `tools/traceability-enforcer.py` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Self-judging plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Dev-workflow-platform plan requirements | `Plans/dev-workflow-platform/requirements.md` |
| Dependency linking plan + delta | `Plans/dependency-linking/requirements.md` |
| Source backend metrics | `Source/Backend/src/metrics.ts` |
| Portal backend metrics | `portal/Backend/src/metrics.ts` |

### Open Findings (P1–P3)

| ID | Severity | Status |
|----|----------|--------|
| QO-001 | P1 | OPEN — Enforcer scope excludes portal/ |
| QO-002 | P2 | OPEN — `dependencyCheckDuration` histogram missing from Source/ metrics |
| QO-003 | P2 | OPEN — 3 FR-dependency-* items incomplete per plan self-report |
| QO-004 | P2 | OPEN — Tiered merge pipeline spec (10 FRs) entirely unimplemented |
| QO-005 | P3 | OPEN — Duplicate frontend test files in Source/Frontend/tests/ |
| QO-006 | P3 | OPEN — eslint-disable-next-line in 2 production hooks |
| QO-007 | P4 | OPEN — DebugPortalPage traceability comment not FR-XXX format |

### Common Pattern Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` used to silence hook warnings rather than fixing deps
- Test file duplication: both `tests/X.test.tsx` and `tests/pages/X.test.tsx` for WorkItemDetailPage and WorkItemListPage

### Spec Drift Pattern

`Specifications/tiered-merge-pipeline.md` is an **approved-but-unstarted** spec. No plan requirements file exists under `Plans/tiered-merge-pipeline/` (only QA/security reports from a prior pipeline run). This is intentional phase-2 scope — not accidental drift.
