# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-06 — Full Audit

### Spec Coverage Trend
- **First run** baseline established.
- `Plans/self-judging-workflow/requirements.md` (FR-WF-*): **100%** (13/13) — the only target the enforcer checks by default.
- `Specifications/dev-workflow-platform.md` (FR-001 to FR-069): **0%** — entire spec unimplemented.
- `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010): **0%** — entire spec unimplemented.
- `FR-dependency-*` (defined in dev-workflow-platform.md): **~94%** implemented in source but NOT matched by enforcer (regex `FR-[A-Z0-9-]+` does not match lowercase IDs like `FR-dependency-types`).

---

## Critical Structural Insight

### The Enforcer Only Sees Plans/, Not Specifications/

The `tools/traceability-enforcer.py` targets the most recently modified `requirements.md` in `Plans/`. The canonical "domain truth" lives in `Specifications/`, which the enforcer **never reads**. This means enforcer PASS means "the plan file's 13 FRs are all touched" — not "the spec's 89 FRs are covered."

### Two Separate Domain Models Coexist

| Spec | Domain | Status |
|------|--------|--------|
| `Specifications/workflow-engine.md` | Self-judging workflow engine (Work Items, routing, assessment pod) | Implemented — traced to `FR-WF-*` in `Plans/` |
| `Specifications/dev-workflow-platform.md` | Dev lifecycle platform (FRs, bugs, dev cycles, pipeline) | NOT implemented — 0 traces |
| `Specifications/tiered-merge-pipeline.md` | E2E merge gate, auto-PR, risk-tiered merge | NOT implemented |

The `Source/` codebase implements the **workflow-engine** domain only. The **dev-workflow-platform** (a 69-FR spec) and **tiered-merge-pipeline** (10-FR spec) are completely absent from `Source/`.

### FR-dependency-* Cross-Spec Reference

The `FR-dependency-*` requirements are defined in `dev-workflow-platform.md` but are implemented in the `workflow-engine` codebase. The spec text references `portal/Shared/types.ts`, `BugDetail`, `FeatureRequestDetail` — files/types that don't exist. The implementation adapts the intent to the WorkItem model.

---

## Common Pattern Violations Found

1. **Direct store import in route handlers** — `workItems.ts`, `intake.ts`, `workflow.ts` all import `../store/workItemStore` directly, violating the service-layer rule.
2. **OTel tracing claimed but absent** — `FR-WF-013` and `FR-021` require OpenTelemetry; zero OTel imports exist anywhere in `Source/`.
3. **Missing `dependencyCheckDuration` histogram** — `FR-dependency-metrics` specifies 4 metrics; only 3 are in `metrics.ts`.
4. **`eslint-disable` in production** — 2 suppressions in `useWorkItems.ts` and `DependencyPicker.tsx`.
5. **Duplicate test files** — `tests/WorkItemDetailPage.test.tsx` + `tests/pages/WorkItemDetailPage.test.tsx` (761 lines combined). Same for WorkItemListPage (548 lines combined).

---

## Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 — active enforcer target |
| `Specifications/dev-workflow-platform.md` | FR-001 to FR-069, FR-dependency-* — ignored by enforcer |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 — ignored by enforcer |
| `Source/Backend/src/metrics.ts` | All Prometheus counters/histograms |
| `Source/Backend/src/routes/workflow.ts` | Dependency dispatch gating logic |
| `Source/Shared/types/workflow.ts` | WorkItemStatus enum — no `pending_dependencies` |
| `Source/Frontend/tests/WorkItemDetailPage.test.tsx` | Legacy test (older, shorter — 368 lines) |
| `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` | Canonical test (newer, 393 lines) |

---

## Enforcement Gap Recommendation

To make the enforcer cover all specs, run:
```bash
python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md
python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md
```
Or extend the enforcer to scan all `*.md` in `Specifications/` automatically.
