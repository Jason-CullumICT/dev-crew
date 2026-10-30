---

## Quality Oracle Findings

### Spec Coverage: ~0% (formal IDs)

**Formal requirement IDs found in specs:**
- `dev-workflow-platform.md`: FR-001 – FR-069 (69 requirements) + FR-dependency-* (~12 sub-IDs)
- `tiered-merge-pipeline.md`: FR-TMP-001 – FR-TMP-010 (10 requirements)

**Traced to source code:**
- FR-001 through FR-069: **0 traced** — entire domain not implemented
- FR-TMP-001 through FR-TMP-010: **0 traced** — no `FR-TMP-*` in `Source/`
- FR-dependency-*: Partially referenced in source, but spec targets `portal/` not `Source/`

**Invented IDs with no spec backing:**
- `FR-WF-001` through `FR-WF-013`: Used extensively throughout `Source/` — **not defined in any spec file**

---

### QO-001: Invented Traceability IDs (`FR-WF-*`) — No Spec Backing
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts:1` (representative; affects all 30+ source files)
- **Detail:** Every `// Verifies:` comment in the codebase references `FR-WF-001` through `FR-WF-013` — IDs that do not exist in any specification file. `workflow-engine.md` is written as a narrative spec with no formal FR-WF-XXX requirement IDs. The traceability enforcer (`python3 tools/traceability-enforcer.py`) cannot validate coverage against specs because the IDs are entirely invented. This makes the entire traceability system decorative rather than functional.
- **Recommendation:** Either (a) assign formal FR-WF-XXX IDs to every requirement in `workflow-engine.md` to match the code's convention, or (b) rename code comments to reference section headings or a new spec table. The spec must be the source of truth.
- **Cross-ref:** Every test file, every source file

---

### QO-002: 69 Formal Requirements in `dev-workflow-platform.md` Entirely Unimplemented
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:341`
- **Detail:** `dev-workflow-platform.md` defines FR-001 – FR-069 describing a completely different domain from what is built: SQLite-backed Feature Requests, Bug Reports, Development Cycles, Votes, Learnings, Pipeline Orchestration (PipelineRun/PipelineStage), and Dev Cycle Traceability (CycleFeedback). The current `Source/` implements a work-item workflow engine with an in-memory store — none of the 69 formal FRs are satisfied. Either this spec describes a deprecated/replaced system (and should be archived) or there is catastrophic scope drift.
- **Recommendation:** Immediately determine the spec's status: (a) if superseded by `workflow-engine.md`, archive or clearly mark `dev-workflow-platform.md` as deprecated; (b) if it still describes intended future state, create a plan and add it to `Plans/`. Do not leave 69 unimplemented formal FRs silently in the active specs directory.

---

### QO-003: FR-TMP-001 – FR-TMP-010 (Tiered Merge Pipeline) Unimplemented in `Source/`
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md:17`
- **Detail:** Ten formal requirements covering Risk Classification, Playwright E2E generation, live E2E runner, auto-PR, AI PR review, auto-merge, and error handling have zero implementation in `Source/`. The `Source/E2E/` directory exists with config files but no actual test files under `tests/`. These requirements appear to target `platform/` (the orchestrator), but `Source/E2E/tests/cycle-{run-id}/` (spec location) is empty.
- **Recommendation:** Confirm whether FR-TMP requirements belong to `platform/` (outside QA scope) or `Source/`. If in scope, create a plan. If in `platform/`, update the spec to make the ownership explicit.

---

### QO-004: Architecture Violation — Route Handlers Call Store Directly
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `Source/Backend/src/routes/workflow.ts:44`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** Architecture rule states "No direct DB calls from route handlers — use the service layer." Route handlers in all three files call `store.createWorkItem`, `store.findById`, `store.findAll`, `store.updateWorkItem`, and `store.softDelete` directly. Only assessment and routing logic has been correctly abstracted into services. The store layer is being used as a pseudo-database accessed directly from HTTP handlers, which violates layering and makes the store impossible to swap without touching route code.
- **Recommendation:** Extract store interactions from route handlers into service functions (e.g., `workItemService.ts`, `intakeService.ts`). Route handlers should call service functions, not the store directly.

---

### QO-005: `FR-dependency-*` Spec Targets `portal/` — Implementation is in `Source/`
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:467`
- **Detail:** `FR-dependency-types` explicitly requires "Shared types in `portal/Shared/types.ts`" and `FR-dependency-schema` requires schema in `portal/Backend`. The actual implementation is in `Source/Shared/types/workflow.ts` and `Source/Backend/`. This is either: (a) a stale spec that wasn't updated when the implementation moved from `portal/` to `Source/`, or (b) the implementation is in the wrong location. In either case, spec and code disagree on directory layout.
- **Recommendation:** Update the spec if the move to `Source/` was intentional, or move the implementation to `portal/` if it belongs there.

---

### QO-006: Two `eslint-disable` Suppressions in Production Frontend
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppressions disable `react-hooks/exhaustive-deps`, hiding dependency array issues. This can cause stale closures and subtle bugs in React effects where the hook re-runs less frequently than it should (or not at all when inputs change).
- **Recommendation:** Fix the underlying dependency issues rather than suppressing the rule. If the dependencies are intentionally omitted for debouncing or manual control, add an explanatory comment per the CLAUDE.md rule ("explicitly document why the error is intentionally suppressed").

---

### QO-007: `WorkItemDetailPage.tsx` Approaching Complexity Threshold
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx:1`
- **Detail:** At 426 lines, this file is 85% of the 500-line large-file threshold. It contains multiple sub-components (action buttons, assessment cards, change history timeline), all inlined. When next touched, split sub-components into `Source/Frontend/src/components/` before it crosses the threshold.
- **Recommendation:** Extract `WorkItemActions`, `AssessmentCard`, and `ChangeHistoryTimeline` as separate component files on the next edit of this page.

---

### QO-008: No Spec — `workflow-engine.md` Has No Formal Requirement IDs
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/workflow-engine.md:1`
- **Detail:** The entire workflow engine spec is written in narrative form with no formal `FR-WF-XXX` identifiers. This makes traceability impossible to enforce mechanically. The `tools/traceability-enforcer.py` can only check that code `Verifies:` comments match spec-defined IDs — but since the spec has no IDs, the tool cannot validate anything meaningful.
- **Recommendation:** Add a Requirements table to `workflow-engine.md` with formal `FR-WF-001` through `FR-WF-013` (or however many are needed), matching what the code already references. This is a one-time spec update that instantly makes all existing Verifies comments valid.

---

```json
{
  "audit_date": "2026-10-30",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "formal_req_ids_in_specs": 81,
    "traced_to_source": 0,
    "invented_ids_in_source": 13,
    "coverage_percent": 0
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "FR-WF-* IDs invented — no spec backing" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform.md FR-001–FR-069 entirely unimplemented" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001–FR-TMP-010 unimplemented in Source/" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly (bypasses service layer)" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-* spec targets portal/ but code is in Source/" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Two eslint-disable suppressions in production frontend" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "WorkItemDetailPage.tsx at 426 lines (85% of 500-line threshold)" },
    { "id": "QO-008", "severity": "P2", "category": "spec-drift", "title": "workflow-engine.md has no formal FR-WF-* requirement IDs" }
  ],
  "grade": "D",
  "grade_rationale": "2 P1 findings (invented IDs + 69 unimplemented requirements) automatically yield D per grading config",
  "prior_findings_recheck": "none — first run"
}
```

---

**Grade: D**

Two P1 findings — invented traceability IDs with no spec backing, and 69 formal requirements in an active spec that are entirely unimplemented — disqualify this from any grade above D under the configured grading rubric. The good news: the `workflow-engine.md` domain is **well-implemented** (structured logging, Prometheus metrics, correct response patterns, soft-delete, traceability comments present in all recently-modified files, no `console.log` in production code). The path to a B grade is primarily a **documentation and spec alignment problem**, not a code quality problem: assign formal IDs to `workflow-engine.md`, resolve the status of `dev-workflow-platform.md`, and extract the store calls into a service layer.
