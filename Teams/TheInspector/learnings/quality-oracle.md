# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-05-18

### Spec Coverage Trend

- **Run 1 (2026-05-18)**: 15.8% coverage across `Specifications/` (15 of 95 FRs traced in Source/)

### Architecture Discovery (Critical)

The `Source/` directory implements the **Self-Judging Workflow Engine** (workflow-engine.md), but its traceability IDs (`FR-WF-001` – `FR-WF-013`) come from `Plans/self-judging-workflow/requirements.md` — **not** from `Specifications/workflow-engine.md` which has no FR-XXX IDs.

The `Specifications/` directory contains requirements for a **separate application** (dev-workflow-platform + tiered-merge-pipeline) that is **not yet implemented** in Source/. This is by design — the platform is being used to build the platform itself — but it creates a massive apparent spec-coverage gap.

### Traceability Enforcer Scope Gap

`tools/traceability-enforcer.py` defaults to scanning only `Plans/self-judging-workflow/requirements.md` (13 FRs). It does **not** scan `Specifications/` files. Running it produces a false PASS while 80 FRs in Specifications/ have zero implementation coverage.

### Key File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Spec IDs (workflow engine) | `Plans/self-judging-workflow/requirements.md` |
| Spec IDs (platform app) | `Specifications/dev-workflow-platform.md` |
| Spec IDs (merge pipeline) | `Specifications/tiered-merge-pipeline.md` |
| Source traceability | `Source/` — all Verifies: FR-WF-XXX and FR-dependency-* |
| Metrics registry | `Source/Backend/src/metrics.ts` |
| App routes | `Source/Backend/src/app.ts` |
| Frontend pages | `Source/Frontend/src/pages/` |
| Enforcer | `tools/traceability-enforcer.py --plan self-judging-workflow` |

### Known Open Issues (as of 2026-05-18)

| ID | Finding | Severity |
|----|---------|---------|
| QO-001 | `GET /api/search` NOT wired in app.ts (FR-dependency-search) — tests are intentionally failing | P1 |
| QO-002 | 69 FRs (FR-001–069) from dev-workflow-platform.md have 0 source coverage | P2 |
| QO-003 | 10 FRs (FR-TMP-001–010) from tiered-merge-pipeline.md have 0 source coverage | P2 |
| QO-004 | Traceability enforcer only covers 13 FRs from one plan file — gives false PASS signal | P2 |
| QO-005 | `pending_dependencies` WorkItemStatus not in enum; dispatch gating returns 400 instead | P2 |
| QO-006 | Missing `dependencyCheckDuration` Histogram in metrics.ts (FR-dependency-metrics) | P3 |
| QO-007 | No Prometheus route latency histogram anywhere (required by CLAUDE.md + FR-004) | P3 |
| QO-008 | No OpenTelemetry tracing implementation (CLAUDE.md architecture rule) | P3 |
| QO-009 | Duplicate test files: WorkItemDetailPage.test.tsx and WorkItemListPage.test.tsx in both tests/ and tests/pages/ | P3 |
| QO-010 | FR-dependency-seed has no implementation in Source/ | P3 |
| QO-011 | `eslint-disable react-hooks/exhaustive-deps` in 2 files | P4 |
| QO-013 | Low Verifies density in test files (many test cases lack traceability comments) | P4 |
| QO-014 | WorkItemDetailPage.tsx is 426 lines — approaching 500-line threshold | P4 |

### Common Pattern Violations

- Route latency middleware not implemented (only request-logging middleware exists)
- OTel absent entirely (no `@opentelemetry/*` imports)
- `eslint-disable` used in 2 places for `react-hooks/exhaustive-deps`

### What Works Well

- **No `console.log`** in any production source file — all logging via structured logger ✓
- **No empty catch blocks** — all catch blocks log or handle errors ✓
- **No hardcoded secrets** — only one `localhost` fallback via `import.meta.env` ✓
- **No direct DB calls from route handlers** — uses store/service layer ✓
- **No framework imports in services** ✓
- **Traceability present in all backend source files** ✓
- **Metrics implemented** for core workflow ops ✓
