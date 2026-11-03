---

## Quality Oracle Findings

### Spec Coverage: ~14% (cross-Specifications)

| Spec File | FRs Defined | FRs Traced in Source | Coverage |
|-----------|-------------|----------------------|----------|
| `workflow-engine.md` (via Plans/self-judging-workflow) | 13 | 13 | **100%** |
| `dependency-linking` plan | ~14 | ~14 | **~100%** |
| `dev-workflow-platform.md` | 70 | 0 | **0%** |
| `tiered-merge-pipeline.md` | 10 | 0 | **0%** |
| **Total across Specifications/** | **~107** | **~27** | **~25%** |

---

### QO-001: Entire `dev-workflow-platform.md` spec is unimplemented
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 — FR-069, 70 requirements)
- **Detail:** This spec defines a full SQLite-backed feature request management platform: Feature Requests, Bug Reports, Development Cycles, AI Voting, Human Approvals, Learnings, Features Browser, and Pipeline Orchestration. The source code implements a completely different product — an in-memory workflow engine with no database. Not a single `// Verifies: FR-001` through `FR-069` comment exists anywhere in Source/. Either this spec is aspirational/superseded and should be archived, or 70 requirements representing ~80% of the described product are unbuilt.
- **Recommendation:** Clarify spec status. If superseded by `workflow-engine.md`, add a deprecation notice or move it to `docs/archive/`. If still active, open work items for the unimplemented FRs. Do not leave a live Specifications/ document with 0% implementation — it poisons every audit.
- **Cross-ref:** TheFixer (if FRs are active work); requirements-reviewer (to clarify spec status)

---

### QO-002: `tiered-merge-pipeline.md` spec (FR-TMP-001 — FR-TMP-010) has 0% coverage
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 functional requirements cover risk classification, Playwright E2E test generation, auto-PR creation, AI PR review, and auto-merge logic. No source file in `Source/` references any `FR-TMP-*` ID. The spec describes platform pipeline enhancements that appear to live in `platform/` (outside Source/) — but platform/ is also the orchestrator infrastructure with no traceability comments. This is an entirely untraceable spec.
- **Recommendation:** Either link existing `platform/` scripts to FR-TMP-* IDs via `# Verifies: FR-TMP-XXX` comments, or mark the spec as a future work aspirational document.
- **Cross-ref:** TheGuardians (auto-merge has security implications); requirements-reviewer

---

### QO-003: Traceability enforcer is blind to 7 of 8 plans on every run
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py` (auto-detect behavior, lines 28–48)
- **Detail:** The enforcer picks the **most-recently-modified** `Plans/*/requirements.md` and checks only that one. Currently it always targets `Plans/self-judging-workflow/requirements.md` (13 FRs, all passing). The 7 other plans — `dependency-linking`, `image-upload`, `duplicate-deprecated-status`, `orchestrated-dev-cycles`, `orchestrator-cycle-dashboard`, `dev-cycle-traceability`, `dev-workflow-platform` — are **never checked**. FR-dependency-* IDs that are present in source come from `dependency-linking/requirements.md` which is never enforced. Running `python3 tools/traceability-enforcer.py` and seeing PASSED gives false confidence.
- **Recommendation:** Update CLAUDE.md verification gate to run the enforcer once per plan: `for f in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$f"; done`. Alternatively, extend the enforcer itself to aggregate all active plans.
- **Cross-ref:** [ESCALATE → TheFixer for tool fix]

---

### QO-004: `fastTrack` field silently dropped — spec requirement FR-WF-004 partially unimplemented
- **Severity:** P2
- **Category:** spec-drift / correctness
- **File:** `Source/Backend/src/routes/workItems.ts:44-50` / `Source/Backend/src/services/router.ts:16-37`
- **Detail:** `Specifications/workflow-engine.md` FR-WF-004 states: *"Item is explicitly flagged as `fast-track` by submitter"* is a fast-track criterion. `Source/Shared/types/workflow.ts:120` has `fastTrack?: boolean` in `CreateWorkItemRequest`. However: (1) the POST handler at `workItems.ts:44-50` strips `fastTrack` — it is not passed to `store.createWorkItem()`, so it is never persisted. (2) `isFastTrack()` in `router.ts` has a comment "handled by overrideRoute" but the mapping from the persisted field to `overrideRoute` is never performed. Submitters sending `fastTrack: true` get silently placed in full-review.
- **Recommendation:** Either (a) persist `fastTrack` on the WorkItem model and check it in `isFastTrack()`, or (b) map it to `WorkItemRoute.FastTrack` at creation time. Update `// Verifies: FR-WF-004` on the fix site. Add a test case.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005: Duplicate test files in Frontend — divergent coverage and maintenance debt
- **Severity:** P2
- **Category:** test-coverage / architecture-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); same for `WorkItemListPage`
- **Detail:** Two separate test files test the same components with different mock setups. The `tests/pages/` versions import Shared types directly and use more complete API mocks; the `tests/` versions are older with a smaller mock surface. When a component changes, both files must be updated or one silently drifts. The Vitest runner will execute both, potentially inflating pass counts while hiding gaps in one version.
- **Recommendation:** Consolidate into the `tests/pages/` versions (which are more complete), delete the older duplicates, and verify test counts remain consistent after cleanup.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: `eslint-disable` suppression of react-hooks/exhaustive-deps
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63` / `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two production files suppress the `react-hooks/exhaustive-deps` rule. This rule prevents stale-closure bugs in `useEffect`/`useCallback`. Suppressing it without thorough comment explaining why (e.g., intentional skip of a ref) risks effects that don't re-run when they should, or infinite re-render loops. The `useWorkItems.ts` suppression at least lists individual filter fields; `DependencyPicker.tsx` needs inspection.
- **Recommendation:** Review each suppression. If the dep array is intentionally partial, add an inline comment explaining the invariant. Consider replacing with `useRef` for stable callbacks.
- **Cross-ref:** None

---

```json
{
  "audit_date": "2026-11-03",
  "auditor": "quality-oracle",
  "spec_coverage_percent": 25,
  "specs_scanned": [
    "Specifications/workflow-engine.md",
    "Specifications/dev-workflow-platform.md",
    "Specifications/tiered-merge-pipeline.md"
  ],
  "total_frs_in_specs": 107,
  "total_frs_traced": 27,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform.md — 70 FRs with 0% coverage" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "tiered-merge-pipeline.md — 10 FRs with 0% coverage" },
    { "id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer checks only 1 of 8 plans" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "fastTrack field silently dropped — FR-WF-004 partial gap" },
    { "id": "QO-005", "severity": "P2", "category": "test-coverage", "title": "Duplicate Frontend test files with divergent coverage" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppression in 2 production hooks" }
  ],
  "grade": "D",
  "grade_reason": "2 P1 findings (70+10 abandoned spec FRs); overall cross-Specifications coverage 25%"
}
```

---

**Grade: D** — Two P1 findings (80 unimplemented Specification FRs across two files), overall spec coverage at 25%. The implemented subset (FR-WF-* and FR-dependency-*) is clean and well-traced at 100%, but the project's `Specifications/` directory presents a deeply misleading picture of what's been built.

**Immediate actions:**
1. **Spec triage** (QO-001/002): Mark `dev-workflow-platform.md` and `tiered-merge-pipeline.md` as aspirational/archive, or open formal work items for the unimplemented FRs. The spec-first principle in CLAUDE.md is violated by having two live specs with no implementation.
2. **Fix the enforcer** (QO-003): Run it against all plans, not just the newest one. Current PASSED verdict is meaningless.
3. **Fix the fastTrack drop** (QO-004): A spec-mandated fast-track criterion is silently ignored by the API.
