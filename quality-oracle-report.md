Now here is the full audit report:

---

## Quality Oracle Findings — 2026-08-06

### Spec Coverage Summary

| Spec file | FRs defined | Traced in source | Coverage |
|-----------|-------------|------------------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 69 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** |
| `Specifications/workflow-engine.md` (no formal IDs) | N/A | ✓ implemented | — |
| `FR-dependency-*` (in dev-workflow-platform.md) | 16 | ~15 | **~94%** |

**Enforcer as run reports 100% PASS** — but only scans `Plans/`, never `Specifications/`.

---

### QO-001 — Traceability Enforcer Blind Spot: Specifications/ Is Never Checked
- **Severity:** P1
- **Category:** spec-drift / tool-gap
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer targets the most recently modified `requirements.md` under `Plans/` only. The `Specifications/` directory — explicitly designated "domain truth" in `CLAUDE.md` — is never scanned. Result: the enforcer PASSes with green despite 89 untraced requirements in `Specifications/`. Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` reveals **76 MISSING** IDs; `--file Specifications/tiered-merge-pipeline.md` reveals **13 MISSING** IDs.
- **Recommendation:** Extend the enforcer to iterate over all `*.md` in `Specifications/` in addition to the active plan. Or add a second CI gate: `for f in Specifications/*.md; do python3 tools/traceability-enforcer.py --file "$f"; done`.
- **Cross-ref:** QO-002, QO-003

---

### QO-002 — dev-workflow-platform.md: 0% Coverage (69 FRs, Entire Spec Unimplemented)
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The primary platform spec (FR-001 to FR-069) defines Feature Requests, Bug Reports, Development Cycles, Pipeline Runs, Learnings, Features Browser — the full product described in the overview. The `Source/` codebase implements a completely different domain: a Self-Judging Workflow Engine (work items, routing, assessment pods). Not one `// Verifies: FR-001` comment exists anywhere. This is the largest spec-drift in the codebase: 69 requirements have zero implementation references.
- **Recommendation:** Either (a) retire `dev-workflow-platform.md` as superseded (document the decision), (b) update it to reflect the actual domain and renumber its FRs to the `FR-WF-*` scheme, or (c) plan an implementation sprint and register it in `Plans/`. The current state means CLAUDE.md's "specs are source of truth" rule is violated at the most fundamental level.
- **Cross-ref:** QO-001

---

### QO-003 — tiered-merge-pipeline.md: 0% Coverage (10 FRs)
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** FR-TMP-001 through FR-TMP-010 (risk classification, Playwright E2E, auto-PR, AI review, auto-merge) have zero corresponding code in `Source/` or `platform/`. These are platform-level features but `Source/E2E/` exists as an empty scaffold — the Playwright runner (FR-TMP-003) directory is present but empty except for config files.
- **Recommendation:** Create a `Plans/tiered-merge-pipeline/` plan or mark the spec as a future roadmap item with an explicit status annotation. If these belong to `platform/` (not `Source/`), document that the enforcer scope should include `platform/` for these FRs.

---

### QO-004 — Architecture Violation: Direct Store Imports in Route Handlers
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** All three route files import directly from `../store/workItemStore`, calling `store.findWorkItemById()`, `store.createWorkItem()`, `store.updateWorkItem()`, etc. from within HTTP request handlers. CLAUDE.md architecture rule: **"No direct DB calls from route handlers — use the service layer."** The service layer (`services/`) exists for router, assessment, dependency, dashboard, and changeHistory — but CRUD operations bypass it entirely.
- **Recommendation:** Extract store CRUD calls into a `workItemService.ts` that routes can call. Route handlers should coordinate, not store-access.

---

### QO-005 — OpenTelemetry Tracing Claimed but Absent
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Source/Backend/src/` (entire directory)
- **Detail:** `FR-WF-013` states "OpenTelemetry tracing: instrument HTTP routes and database calls; propagate W3C `traceparent` header." `FR-021` in dev-workflow-platform.md has the same requirement. Zero OTel imports (`@opentelemetry/`, `tracer`, `createSpan`) exist anywhere in `Source/`. The `// Verifies: FR-WF-013` comments claim observability compliance but OTel tracing is simply absent. Structured logging and Prometheus metrics ARE present; only the tracing pillar is missing.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, configure a `NodeSDK` in a `tracing.ts` bootstrap file, and ensure `traceparent` is forwarded. This closes the three-pillars gap (logs ✓, metrics ✓, traces ✗).

---

### QO-006 — Missing `dependencyCheckDuration` Histogram
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies **4** Prometheus metrics: `dependencyOperations` counter ✓, `dispatchGatingEvents` counter ✓, `cycleDetectionEvents` counter ✓, `dependencyCheckDuration` **histogram** ✗. The histogram is absent. The traceability comment `// Verifies: FR-dependency-metrics` on the three existing counters falsely implies full compliance. The `dependency_check_duration_seconds` histogram (covering BFS and `hasUnresolvedBlockers` call latency) is never created.
- **Recommendation:** Add a `new Histogram({ name: 'dependency_check_duration_seconds', ... })` to `metrics.ts` and instrument it in `computeHasUnresolvedBlockers()` / `detectCycle()` in `dependency.ts`.

---

### QO-007 — `pending_dependencies` Status Gap vs Spec
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts:214`, `Source/Backend/src/routes/workflow.ts:230`
- **Detail:** `FR-dependency-dispatch-gating` specifies: "unresolved blockers → set to `pending_dependencies` instead [of advancing to `in_development`]." The `WorkItemStatus` enum has no `pending_dependencies` value. The `VALID_STATUS_TRANSITIONS` comment claims to "support pending_dependencies blocking," but the actual behavior is: dispatch returns HTTP 400 and leaves the item in `approved`. The spec intent is a persistent state that makes the item visually recognizable as blocked; the implementation is a transient error response. The cascade auto-dispatch (resolving a blocker → auto-dispatch dependents) logic works but acts on `approved`-status items, not `pending_dependencies`-status items.
- **Recommendation:** Either (a) add `PendingDependencies = 'pending-dependencies'` to `WorkItemStatus`, add it to `VALID_STATUS_TRANSITIONS`, and update the dispatch route to set it; or (b) formally document the deviation in the spec with a rationale note.

---

### QO-008 — Duplicate Test Files: WorkItemDetailPage (761 lines combined)
- **Severity:** P3
- **Category:** test-quality
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
- **Detail:** Two test files cover the same component. The root-level file appears to be an older version; the `pages/` sub-directory version has more tests and uses direct type imports. There is no canonical designation. Test suites run both, creating duplicate coverage reports and ambiguity about which file is authoritative.
- **Recommendation:** Delete `tests/WorkItemDetailPage.test.tsx` (the older root-level file) and keep `tests/pages/WorkItemDetailPage.test.tsx` as canonical. Same issue exists for `WorkItemListPage` (286 + 262 = 548 combined lines).

---

### QO-009 — `eslint-disable` in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files use `// eslint-disable-next-line react-hooks/exhaustive-deps` to suppress the exhaustive-deps rule. This rule guards against stale closures and incorrect dependency arrays in `useEffect`/`useCallback`. While sometimes legitimately needed, the rule says all suppressions must be justified with a documented reason. Neither suppression has an explanatory comment.
- **Recommendation:** Add an inline reason comment (e.g., `// intentionally omitting X to avoid re-mount on every render`). If the omission is genuinely safe, document why. If not, fix the dependency array.

---

### QO-010 — FR-dependency-* Spec References Non-Existent Files
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-dependency-types, FR-dependency-section, FR-dependency-integration)
- **Detail:** The dependency spec was written for the dev-workflow-platform domain but implemented in the workflow-engine codebase. The spec text references `portal/Shared/types.ts`, `BugStatus`, `FeatureRequestStatus`, `BugDetail`, `FeatureRequestDetail` — none of which exist. The code implements equivalent features using `WorkItemStatus`, `WorkItem`, `WorkItemDetailPage`. The spec is misaligned with the actual implementation files.
- **Recommendation:** Update `FR-dependency-*` entries in `dev-workflow-platform.md` to reference the actual paths and types (`Source/Shared/types/workflow.ts`, `WorkItem`, `WorkItemDetailPage`) and clarify that the implementation belongs to the workflow-engine domain.

---

### QO-011 — `Source/Backend/src/logger.ts` Is a Redundant Re-Export
- **Severity:** P4
- **Category:** simplification
- **File:** `Source/Backend/src/logger.ts:1`
- **Detail:** This file contains only one line: `export { logger as default } from './utils/logger';`. It exists solely to allow shorter import paths. Two separate logger modules create confusion for new contributors about which is canonical.
- **Recommendation:** Either eliminate the re-export file and update all imports to point to `./utils/logger`, or rename `utils/logger.ts` → `logger.ts` and remove the re-export stub.

---

```json
{
  "audit_date": "2026-08-06",
  "spec_coverage": {
    "plans_self_judging_workflow": { "total": 13, "covered": 13, "pct": 100 },
    "specifications_dev_workflow_platform": { "total": 69, "covered": 0, "pct": 0 },
    "specifications_tiered_merge_pipeline": { "total": 10, "covered": 0, "pct": 0 },
    "fr_dependency_star": { "total": 16, "covered": 15, "pct": 94 }
  },
  "enforcer_result": "PASS (Plans/ only) / FAIL (Specifications/)",
  "grade": "D",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "tool-gap",             "title": "Traceability enforcer never scans Specifications/" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift",           "title": "dev-workflow-platform.md 0% covered (69 FRs)" },
    { "id": "QO-003", "severity": "P1", "category": "spec-drift",           "title": "tiered-merge-pipeline.md 0% covered (10 FRs)" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","title": "Direct store access in route handlers (3 files)" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift",           "title": "OpenTelemetry tracing absent despite FR-WF-013 claim" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift",           "title": "dependencyCheckDuration histogram missing from metrics.ts" },
    { "id": "QO-007", "severity": "P2", "category": "spec-drift",           "title": "pending_dependencies status unimplemented (spec gap)" },
    { "id": "QO-008", "severity": "P3", "category": "test-quality",         "title": "Duplicate test files: WorkItemDetailPage + WorkItemListPage" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation",    "title": "eslint-disable in production source (2 instances)" },
    { "id": "QO-010", "severity": "P3", "category": "spec-drift",           "title": "FR-dependency-* spec references non-existent portal files" },
    { "id": "QO-011", "severity": "P4", "category": "simplification",       "title": "logger.ts is a redundant single-line re-export" }
  ],
  "p1_count": 3,
  "p2_count": 4,
  "p3_count": 3,
  "p4_count": 1
}
```

---

**Grade: D** — 3 P1s. Per grading config: `D: { max_p1: 999 }` (any P1 present = D). The P1s are structural (tool gap + two completely unimplemented specs), not code-quality failures. The workflow-engine system itself is well-implemented and scores 100% on its own plan.

**Escalation:** No security findings to route to TheGuardians. P2–P4 findings are implementation/quality debt for **TheFixer**.
