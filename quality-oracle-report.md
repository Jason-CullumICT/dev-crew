---

## Quality Oracle Findings

### Spec Coverage: 14% (Specifications-level) / 100% (Plans-level)

**Two separate spec namespaces discovered:**

| Namespace | Source | FR Count | Implementation | Enforcer Checked? |
|-----------|--------|----------|---------------|------------------|
| `FR-001`–`FR-069` + `FR-dependency-*` | `Specifications/dev-workflow-platform.md` | 92 | `portal/` | ❌ No |
| `FR-WF-001`–`FR-WF-013` | `Plans/self-judging-workflow/requirements.md` | 13 | `Source/` | ✅ Yes |

The traceability enforcer passes **but only audits Plans, not Specifications**. `Source/` has zero traceability to any canonical spec in `Specifications/`.

---

### QO-001: Source/ system has no canonical Specification — entirely plan-traced only
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/` (entire directory)
- **Detail:** `Source/` implements a self-judging Work Item workflow (FR-WF-001..FR-WF-013). These FR IDs exist only in `Plans/self-judging-workflow/requirements.md`, not in any document under `Specifications/`. The project rule is "Specifications are source of truth." The enforcer passes because it targets Plans — but `Specifications/` is where domain truth must live per CLAUDE.md. Any spec in Plans is a *plan*, not a domain specification.
- **Recommendation:** Either promote `Plans/self-judging-workflow/requirements.md` to a proper `Specifications/workflow-engine-spec.md` document, or explicitly document that `Source/` is governed by the Plans directory, and update the traceability enforcer to also scan `Specifications/` for FR-WF-* IDs.
- **Cross-ref:** TheFixer (code change needed to enforcer), requirements-reviewer (spec promotion)

---

### QO-002: Route handlers call store directly — service layer bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12,44,73,79,89,134,142` / `Source/Backend/src/routes/workflow.ts:15,44,71,99,119,155,175,217,269,317,359` / `Source/Backend/src/routes/intake.ts:4,19,42`
- **Detail:** Three route files import `workItemStore` directly and call store functions (`createWorkItem`, `findAll`, `findById`, `updateWorkItem`, `softDelete`). CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* The store is the persistence layer equivalent; routes must go through services. Only `Source/Backend/src/routes/workflow.ts` partially delegates to services (assessment, router, dependency), but still calls the store directly for state reads/writes around those service calls.
- **Recommendation:** Create a `workItemsService.ts` that wraps all store operations with business logic validation, and refactor the three route files to call only service functions. Route handlers should be thin: parse request → call service → serialize response.
- **Cross-ref:** TheFixer (refactor)

---

### QO-003: `portal/Backend/src/routes/teamDispatches.ts` — no Verifies comment, unlinked implementation
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `portal/Backend/src/routes/teamDispatches.ts:1`
- **Detail:** This file (85 lines, modified in the last 14 days per git log) has zero `// Verifies:` traceability comments. `teamDispatch` / `TeamsPage` feature does not appear in `Specifications/dev-workflow-platform.md` at all — the feature is unspecified and untraced. This is unlinked scope creep.
- **Recommendation:** Either add the team dispatch feature as a formal FR to the canonical spec and back-link with Verifies comments, or document the scope decision in a Plan.
- **Cross-ref:** requirements-reviewer (spec addition needed)

---

### QO-004: Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` / `Source/Frontend/tests/WorkItemListPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`
- **Detail:** Two copies of each test exist. The root-level copies (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) appear to be older/legacy versions that were not removed when `tests/pages/` equivalents were created. Both files have Verifies comments, so both are picked up by coverage tools — creating false confidence and potential test-runner double-execution.
- **Recommendation:** Delete `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/WorkItemListPage.test.tsx` (the root-level duplicates). The `tests/pages/` versions are more comprehensive (more test cases per Verifies count).
- **Cross-ref:** TheFixer

---

### QO-005: `FR-dependency-seed` unimplemented in both portal/ and Source/
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:475`
- **Detail:** `FR-dependency-seed` (idempotent seed data: BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; etc.) has no `// Verifies:` references anywhere in portal/ or Source/. This requirement was never implemented.
- **Recommendation:** Either implement the seed migration/script in `portal/Backend` and add Verifies comment, or explicitly mark this FR as deferred/out-of-scope with a rationale comment in the spec.

---

### QO-006: `eslint-disable-next-line` comments — suppressed hook exhaustive-deps warnings
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63` / `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two instances of `// eslint-disable-next-line react-hooks/exhaustive-deps` suppress lint rules rather than fixing the dependency array. This can lead to stale closure bugs where the hook doesn't re-run when it should.
- **Recommendation:** Audit these two suppressions. Either add the missing dependency, refactor with `useCallback`/`useRef`, or document why the suppression is intentional with a comment explaining the reasoning.

---

### QO-007: Traceability enforcer only audits Plans — Specifications are invisible to CI gate
- **Severity:** P3
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:1-30`
- **Detail:** The enforcer auto-discovers the most-recently-modified plan in `Plans/` and checks its FR IDs against `Source/`. It never reads `Specifications/`. Per CLAUDE.md, Specifications are the source of truth — but they are completely outside the enforcer's scope. A specification requirement could be removed or never implemented and the gate would still pass.
- **Recommendation:** Extend the enforcer to optionally scan `Specifications/` for FR IDs and cross-reference them against both `portal/` and `Source/`. Or add a separate gate: `python3 tools/traceability-enforcer.py --specs`.

---

```json
{
  "audit_date": "2026-10-05",
  "spec_coverage": {
    "specifications_dir": {
      "total_fr_ids": 92,
      "traced_in_portal": 70,
      "traced_in_source": 17,
      "untraced": 22,
      "coverage_pct": 76
    },
    "plans_dir": {
      "total_fr_ids": 13,
      "traced_in_source": 13,
      "coverage_pct": 100,
      "enforcer_status": "PASSED"
    }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Source/ has no canonical Specification" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Route handlers bypass service layer, call store directly" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "teamDispatches.ts unspecified and untraced" },
    { "id": "QO-004", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-005", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed unimplemented" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable-next-line suppressing hook exhaustive-deps" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "Traceability enforcer blind to Specifications/" }
  ],
  "grade": "C",
  "no_violations": {
    "console_log_in_production": true,
    "hardcoded_secrets": true,
    "empty_catch_blocks": true,
    "large_files_over_500_lines": true
  }
}
```

---

**Grade: C** — 1 P1 (Source/ spec namespace gap), 3 P2s (architecture bypass, unspecified feature, duplicate tests). No P1 security/safety issues. The in-flight enforcer passes on Plans but is silent on Specifications — the tooling gap is the most actionable fix.
