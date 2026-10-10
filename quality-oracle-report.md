---

## Quality Oracle Findings

### Spec Coverage: ~14% (Plans-scoped) / ~0% (Canonical Specifications/)

| Scope | Requirements | Traced to Source | Coverage |
|-------|-------------|-----------------|---------|
| `Plans/self-judging-workflow/requirements.md` (enforcer target) | 13 FRs | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` | ~85 FRs (FR-001–FR-069) | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 10 FRs (FR-TMP-001–FR-TMP-010) | 0 | **0%** |
| **Total canonical Specifications/** | **~95 FRs** | **0** | **~0%** |

---

### QO-001: Canonical Platform Spec Completely Unimplemented (or Superseded Without Retirement)
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 through FR-069, ~85 FRs)
- **Detail:** `dev-workflow-platform.md` defines a SQLite-backed platform covering Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration, and a full-featured React frontend (FR-022–FR-030, FR-033–FR-069). The actual implementation is a completely different domain: an **in-memory Work Item workflow engine** (FR-WF-001–FR-WF-013 from `Plans/self-judging-workflow/`). Not one of the 85 canonical spec FRs has a `Verifies:` reference in `Source/`. The domain, data model, persistence layer, and API surface are entirely different from what the canonical spec specifies.
- **Possible root cause:** A domain pivot occurred — the team moved from the dev-workflow-platform design to the self-judging-workflow-engine design — but `dev-workflow-platform.md` was never retired or updated to match.
- **Recommendation:** Determine which spec is canonical. If `workflow-engine.md` is current: move `dev-workflow-platform.md` to `docs/archive/` and add a header noting it was superseded. If the platform spec is still future roadmap: add a status marker (`## Status: PLANNED — Not Yet Implemented`) and update the traceability enforcer to distinguish active vs. roadmap specs. Either way, `Specifications/` must not contain stale specs that misrepresent what's built.
- **Cross-ref:** TheFixer (if code changes needed), requirements-reviewer (spec ownership)

---

### QO-002: Traceability Enforcer Has False-Positive Pass — Ignores Canonical Specifications/
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (auto-selects `Plans/self-judging-workflow/requirements.md`)
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` under `Plans/`, giving it a scope of only 13 FRs. It reports `TRACEABILITY PASSED` — but this completely ignores 95+ FRs in `Specifications/`. The CLAUDE.md architecture rule is "implementation traces to specs, never the other way around," and Specifications/ is designated "The most critical documents." The enforcer's pass signal creates false confidence: it certifies compliance while 100% of canonical spec FRs go unchecked.
- **Recommendation:** Add a `--specs-dir Specifications/` mode (or update the auto-detect logic) so the enforcer also scans `Specifications/*.md` for requirement IDs and cross-references them against `Source/`. Until then, CI teams should not treat the enforcer's pass as a complete coverage signal.
- **Cross-ref:** [ESCALATE → TheFixer for tooling fix]

---

### QO-003: Missing Route — `GET /api/search` Not Wired; 5 Tests Will Fail
- **Severity:** P1
- **Category:** untested / implementation-gap
- **File:** `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** The test file opens with an explicit comment: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented. This is intentional."* Five test cases cover `FR-dependency-search` (cross-entity typeahead search). The route handler file doesn't exist and `app.ts` has no `/api/search` registration. Running `npm test` in the backend will produce 5 failures.
- **Failure scenario:** Any CI gate running `npm test` in `Source/Backend/` will fail due to 5 assertions hitting a 404 on `GET /api/search` instead of 200.
- **Recommendation:** Either implement the route (create `Source/Backend/src/routes/search.ts`, register in `app.ts`) or convert the tests to `test.todo(...)` markers while the feature is genuinely deferred. The current state of "intentional failing tests committed to main" violates the "zero new failures" verification gate rule.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004: Non-Standard FR IDs (`FR-dependency-*`) Not Traceable to Any Specification
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** Multiple — `Source/Backend/src/services/dependency.ts:1`, `Source/Backend/tests/services/dependency.test.ts:1`, `Source/Frontend/tests/components/DependencyPicker.test.tsx:1`, and ~12 more files
- **Detail:** A large set of custom requirement IDs are used in `Verifies:` comments throughout source and tests: `FR-dependency-service`, `FR-dependency-dispatch-gating`, `FR-dependency-endpoints`, `FR-dependency-search`, `FR-dependency-metrics`, `FR-dependency-types`, `FR-dependency-schema`, `FR-dependency-api-types`, `FR-dependency-backend-tests`, `FR-dependency-picker`, `FR-dependency-section`, `FR-dependency-blocked-badge`, `FR-dependency-api-client`. None of these IDs appear in any document under `Specifications/`. They were invented organically during implementation, violating the "Specs are source of truth — implementation traces to specs, never the other way around" rule.
- **Failure scenario:** An auditor following a `Verifies: FR-dependency-service` comment to the spec will find no corresponding document, making code review impossible to validate against design intent.
- **Recommendation:** Create `Plans/dependency-feature/requirements.md` (or a `Specifications/` section) that formally defines all `FR-dependency-*` requirements with acceptance criteria. Run the traceability enforcer against that file. This retroactively restores traceability.
- **Cross-ref:** requirements-reviewer (spec authoring)

---

### QO-005: `eslint-disable react-hooks/exhaustive-deps` Without Rationale Comment
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist with no explanatory comment. The `exhaustive-deps` rule prevents stale closure bugs — when a dependency is intentionally omitted, future maintainers cannot tell whether the omission is deliberate or a bug. CLAUDE.md requires "Never swallow errors silently — every `catch` block must either re-throw, log with full context, or **explicitly document why**." The same principle applies to lint suppressions.
  - `DependencyPicker.tsx:82`: suppressed on a `useCallback` dependency array `[selectedIdSet, blocksIdSet, currentItemDocId]`
  - `useWorkItems.ts:63`: suppressed on a `useEffect` cleanup pattern
- **Recommendation:** Add inline comment explaining the intent, e.g.: `// eslint-disable-next-line react-hooks/exhaustive-deps — intentional: fetchFn is stable across renders; adding it would cause infinite re-fetch`

---

### QO-006: Silently Swallowed Parse Error in API Client Lacks Documentation
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `.catch(() => ({}))` silently discards any `response.json()` parse errors. The intent is correct (graceful fallback for non-JSON error bodies), but the CLAUDE.md rule requires every catch to "log with full context, or explicitly document why the error is intentionally suppressed." This catch has no comment.
- **Failure scenario:** If the server returns a malformed JSON error body, the parse error is swallowed and the user sees only "Request failed: 500" — no diagnostics.
- **Recommendation:** Add: `// Intentionally suppress parse error — non-JSON error body; fall back to HTTP status`

---

### QO-007: tiered-merge-pipeline.md FRs (FR-TMP-001–FR-TMP-010) Have Zero Source Coverage
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 pipeline FRs (risk classification, E2E test generation, auto-PR, AI PR review, auto-merge, etc.) exist in Specifications/ with no corresponding `Verifies: FR-TMP-*` in source. These likely belong to `platform/` infrastructure (the pipeline runner), which is excluded from team pipelines. However, since they live in canonical Specifications/, they count as unimplemented unless formally scoped to platform/.
- **Recommendation:** Either add traceability comments in `platform/` scripts referencing FR-TMP-* IDs, or add a status note to the spec clarifying these are platform/ infrastructure requirements outside the Source/ scope.

---

### Overall Grade: **D**

| Criterion | Threshold (Grade A) | Actual |
|-----------|-------------------|--------|
| P1 findings | 0 | **3** |
| P2 findings | ≤3 | **2** |
| Canonical spec coverage | ≥80% | **~0%** |

The three P1 findings (stale canonical spec, blind traceability enforcer, failing test suite from missing route) push the grade to **D** under the configured grading rules.

---

```json
{
  "audit_date": "2026-10-10",
  "grade": "D",
  "spec_coverage": {
    "plans_scoped_pct": 100,
    "canonical_specs_pct": 0,
    "note": "Enforcer only covers Plans/ (13 FRs). Specifications/ has ~95 FRs with 0 source coverage."
  },
  "findings": [
    {
      "id": "QO-001", "severity": "P1", "category": "spec-drift",
      "title": "Canonical platform spec (69+ FRs) entirely unimplemented — domain pivot not retired",
      "file": "Specifications/dev-workflow-platform.md"
    },
    {
      "id": "QO-002", "severity": "P1", "category": "spec-drift",
      "title": "Traceability enforcer blind to Specifications/ — false-positive PASSED signal",
      "file": "tools/traceability-enforcer.py"
    },
    {
      "id": "QO-003", "severity": "P1", "category": "implementation-gap",
      "title": "GET /api/search not wired — 5 tests documented as intentionally failing",
      "file": "Source/Backend/tests/routes/search.test.ts"
    },
    {
      "id": "QO-004", "severity": "P2", "category": "spec-drift",
      "title": "FR-dependency-* IDs have no backing specification document",
      "file": "Source/Backend/src/services/dependency.ts"
    },
    {
      "id": "QO-005", "severity": "P2", "category": "pattern-violation",
      "title": "eslint-disable react-hooks/exhaustive-deps without rationale",
      "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63"]
    },
    {
      "id": "QO-006", "severity": "P3", "category": "pattern-violation",
      "title": "Swallowed JSON parse error missing mandatory suppression comment",
      "file": "Source/Frontend/src/api/client.ts:26"
    },
    {
      "id": "QO-007", "severity": "P3", "category": "spec-drift",
      "title": "FR-TMP-001–FR-TMP-010 (tiered-merge-pipeline) have zero source Verifies",
      "file": "Specifications/tiered-merge-pipeline.md"
    }
  ],
  "escalations": [
    "QO-002 → TheFixer (enforcer tooling fix)",
    "QO-003 → TheFixer (implement search route or convert tests to todo)"
  ]
}
```
