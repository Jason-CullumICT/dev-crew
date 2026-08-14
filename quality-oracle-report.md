---

## Quality Oracle Findings
**Audit date:** 2026-08-14 | **Scope:** `Source/` + `Specifications/` + `tools/` | **Mode:** Full static audit

---

### Spec Coverage: ~70% (enforcer-reported 100% — see QO-002)

| Spec Document | FR IDs Defined | Traced in Source | Coverage |
|---|---|---|---|
| `Specifications/workflow-engine.md` | 0 (no FR-XXX IDs) | N/A | ❌ Unenforced |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–010 | 0 | 0% |
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001–013 (13) | 13 | ✅ 100% |
| `Plans/dependency-linking/requirements.md` | FR-dependency-* (13) | ~11 | ~85% |

---

### QO-001: `GET /api/search` Route Not Wired Into App
- **Severity:** P1
- **Category:** correctness
- **File:** `Source/Backend/src/app.ts:1` / `Source/Backend/tests/routes/search.test.ts:3`
- **Detail:** FR-dependency-search requires `GET /api/search?q=` for the DependencyPicker typeahead. The test file itself contains an explicit comment: *"As of this review cycle the GET /api/search endpoint is NOT wired into `Source/Backend/src/app.ts`. These tests document the expected contract and will FAIL until the route is implemented."* The route exists in tests but no handler is registered in `app.ts`. The DependencyPicker search feature is completely non-functional in production.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` (scan `workItemStore.findAll()` filtering by title/description) and register it in `app.ts` as `app.use('/api/search', searchRouter)`. Then add `// Verifies: FR-dependency-search` traceability comment.
- **Cross-ref:** Route registration pattern matches `workflow.ts` / `workItems.ts`

---

### QO-002: Traceability Enforcer Blind to `Specifications/` Directory
- **Severity:** P1
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py:49`
- **Detail:** The enforcer picks `Plans/**/ requirements.md` files by modification time — it targets whichever plan was last touched. It never reads `Specifications/`. This means: (a) `Specifications/workflow-engine.md` is never enforced because it has no FR-XXX IDs, and (b) `Specifications/tiered-merge-pipeline.md` FR-TMP-001–010 requirements are fully invisible to enforcement. The enforcer reports "TRACEABILITY PASSED" — giving false confidence that the entire spec corpus is covered, when only a single plan file is checked. CLAUDE.md states "Specs are source of truth — implementation traces to specs."
- **Recommendation:** Either (1) add formal FR-XXX IDs to all `Specifications/*.md` files and extend the enforcer to scan them, or (2) add a `--specs-dir` mode that accepts the Specifications/ directory and emits unmatched FR-XXX IDs as failures. Minimum viable fix: add FR-XXX IDs to `Specifications/workflow-engine.md` mirroring the FR-WF-* IDs already in the plan.
- **Cross-ref:** QO-003 (root cause: spec lacks IDs)

---

### QO-003: `Specifications/workflow-engine.md` Has No Formal FR-XXX Requirement IDs
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Specifications/workflow-engine.md`
- **Detail:** CLAUDE.md rule: *"Specs are source of truth — implementation traces to specs, never the other way around."* All 13 FR-WF-* traceability comments in `Source/` point to `Plans/self-judging-workflow/requirements.md`, not to the primary specification. The spec document uses markdown tables without requirement IDs. Implementation traces to the *Plan* (a design artifact) rather than the *Spec* (the source of truth). This breaks the spec-first architecture: if the plan is deleted or changes, all traceability becomes dangling.
- **Recommendation:** Add a **Functional Requirements** section to `Specifications/workflow-engine.md` with formal `FR-WF-001` through `FR-WF-013` rows matching the plan. This makes the spec self-contained and lets the enforcer target `Specifications/` directly.
- **Cross-ref:** QO-002 (enforcer fix depends on this)

---

### QO-004: `dependencyCheckDuration` Histogram Missing from Metrics
- **Severity:** P2
- **Category:** spec-drift / correctness
- **File:** `Source/Backend/src/metrics.ts:63`
- **Detail:** FR-dependency-metrics (in `Plans/dependency-linking/requirements.md`) specifies **4** Prometheus instruments: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` **histogram**, and `cycleDetectionEvents` counter. `metrics.ts` implements exactly 3 counters — the `dependencyCheckDuration` histogram is absent. The tests in `metrics.test.ts` also only verify the 3 counters, so this gap is invisible to CI. Missing histograms means P95/P99 latency for dependency resolution is unobservable.
- **Recommendation:** Add to `metrics.ts`:
  ```ts
  // Verifies: FR-dependency-metrics — dependency_check_duration_seconds histogram
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency resolution checks',
    labelNames: ['operation'] as const,
    registers: [registry],
  });
  ```
  Then instrument `computeHasUnresolvedBlockers` and `detectCycle` calls. Add a test to `metrics.test.ts` verifying the histogram is present.
- **Cross-ref:** FR-dependency-metrics acceptance criteria states "All four metrics visible at GET /metrics"

---

### QO-005: `pending_dependencies` Status Absent from `WorkItemStatus` Enum
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts:5`
- **Detail:** FR-dependency-dispatch-gating requires that when a work item has unresolved blockers, it transitions to `pending_dependencies` status (mirroring `portal/`). The `WorkItemStatus` enum has no `PendingDependencies` value. The implementation uses a computed `hasUnresolvedBlockers: boolean` field on `WorkItem` instead — which is a valid alternative but **undocumented deviation** from the spec. Downstream API consumers calling `PATCH /api/work-items/:id/approve` may expect to receive `status: "pending_dependencies"` but instead get `status: "approved"` with `hasUnresolvedBlockers: true`. The `VALID_STATUS_TRANSITIONS` map also doesn't account for the pending state.
- **Recommendation:** Either (a) add `PendingDependencies = 'pending_dependencies'` to the enum and wire it into dispatch gating, or (b) formally document in `Specifications/workflow-engine.md` that the Source/ implementation uses the `hasUnresolvedBlockers` flag pattern instead of a status value, so future implementers aren't confused.

---

### QO-006: `eslint-disable` Suppressions in Two Production Files
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` via `// eslint-disable-next-line`. This rule guards against stale closure bugs in async hooks. Suppressions silence the lint signal without fixing the underlying cause. In `useWorkItems.ts`, the missing dep is likely a fetch function — if that function changes (e.g., when filters update), the hook may silently use stale state.
- **Recommendation:** Resolve the underlying dependency issue: wrap the callback in `useCallback` with proper deps, or restructure the effect to avoid the closure. Remove the suppress comment once fixed.

---

### QO-007: Dual Logger Pattern Creates Maintenance Confusion
- **Severity:** P3
- **Category:** simplification
- **File:** `Source/Backend/src/logger.ts`, `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger files serve the same purpose. `utils/logger.ts` is the actual implementation (pino-based structured logging). `logger.ts` is a shim that wraps `utils/logger.ts` to adapt the call signature. This split emerged from different coders implementing logging independently. Future changes to the logger interface risk diverging the two files. New coders face a "which logger should I import?" question.
- **Recommendation:** Consolidate: move the normalization adapter into `utils/logger.ts` as the single export, then delete `logger.ts`. Update all import sites. This is a 1-file deletion + N import path updates.

---

### QO-008: `DebugPortalPage` Has No Traceability and No Test
- **Severity:** P3
- **Category:** untested / spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** This page carries no `// Verifies: FR-XXX` comment and has no corresponding test file in `Source/Frontend/tests/`. It was recently modified (within 14-day window). CLAUDE.md rule: "Every FR needs a test with `// Verifies: FR-XXX` traceability comments." The page appears to be an iframe portal embed — if it's intentional scaffolding, it should at least have a smoke-render test.
- **Recommendation:** Add a minimal `// Verifies: FR-WF-009` comment (or the appropriate FR) and a render test confirming the component mounts without crashing. If this page is out of scope for the current spec, document that in a comment.

---

### Summary JSON

```json
{
  "audit_date": "2026-08-14",
  "spec_coverage": {
    "enforcer_reported": "100%",
    "true_coverage": "~70%",
    "note": "Enforcer only scans Plans/self-judging-workflow/requirements.md; Specifications/ is not enforced"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "correctness",            "title": "/api/search route not registered in app.ts" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift",             "title": "Traceability enforcer blind to Specifications/ directory" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "workflow-engine.md has no formal FR-XXX requirement IDs" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift",             "title": "dependencyCheckDuration histogram missing from metrics.ts" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift",             "title": "pending_dependencies absent from WorkItemStatus enum (undocumented deviation)" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation",     "title": "eslint-disable suppressions hiding hook dependency warnings" },
    { "id": "QO-007", "severity": "P3", "category": "simplification",        "title": "Dual logger files — utils/logger.ts wrapped by logger.ts" },
    { "id": "QO-008", "severity": "P3", "category": "untested",              "title": "DebugPortalPage has no traceability comment and no test" }
  ],
  "grade": "C",
  "grade_rationale": "2 P1 findings (threshold: max_p1: 0 for grade A or B), 3 P2 findings. Graded C per config: max_p1: 2, max_p2: 15, min_spec_coverage: 40.",
  "escalation": []
}
```

---

**Grade: C** — Two P1 findings (search route dark, enforcer blind spot) and three P2 spec-drift items. No security escalations. Route to **TheFixer** for QO-001 and QO-004; spec updates (QO-002, QO-003, QO-005) should go through the **requirements-reviewer** role in TheATeam.
