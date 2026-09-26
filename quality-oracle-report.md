---

## Quality Oracle Findings

### Spec Coverage Summary

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| Plans/self-judging-workflow (FR-WF-\*) | 13 | 13 | **100%** ✅ |
| Plans/dependency-linking (FR-dependency-\*) | 16 | 15 | **94%** ⚠️ |
| Specifications/dev-workflow-platform.md (FR-001…FR-069) | 69 | 0 in Source/ | N/A — lives in `portal/` codebase |
| Specifications/tiered-merge-pipeline.md (FR-TMP-\*) | 10 | 0 in Source/ | N/A — lives in `platform/` infrastructure |

**Active codebase overall: 28/29 actively-planned requirements traced. 1 unimplemented.**

---

### QO-001: FR-dependency-seed — Unimplemented Requirement
- **Severity:** P2
- **Category:** spec-drift / unimplemented
- **File:** Plans/dependency-linking/requirements.md:46 (`❌ Missing`)
- **Detail:** `FR-dependency-seed` is a confirmed unimplemented requirement. It demands an idempotent seed function (`seed.ts`) that establishes known dependency relationships (BUG-0010 blocked_by BUG-0003…0007; FR-0004 blocked_by FR-0003; etc.) on server startup. The plan explicitly flags it as missing. No `// Verifies: FR-dependency-seed` comment exists anywhere in `Source/`. Without this seed, integration tests and demos that rely on pre-wired dependency graphs will produce empty results for the named work items.
- **Recommendation:** Implement `Source/Backend/src/store/seedDependencies.ts` (or equivalent), call it idempotently in `app.ts` after store initialization, add `// Verifies: FR-dependency-seed` comment, and add a test case in the dependency test suite. Route through TheFixer.
- **Cross-ref:** Plans/dependency-linking/requirements.md:23–26 (spec), Specifications/dev-workflow-platform.md:475 (canonical FR)

---

### QO-002: Traceability Enforcer Auto-Selects Stale Plan — False Green
- **Severity:** P2
- **Category:** architecture-violation / process
- **File:** tools/traceability-enforcer.py:1 (auto-detection logic)
- **Detail:** The enforcer picks the most-recently-modified `requirements.md` under `Plans/`, which is `Plans/self-judging-workflow/requirements.md`. This plan is 100% covered. However, `Plans/dependency-linking/requirements.md` — the most recently completed feature — has an open gap (FR-dependency-seed). Running `python3 tools/traceability-enforcer.py` always passes, even when a newer plan has unimplemented items. This masks QO-001 entirely from automated gates. CLAUDE.md's verification gate is therefore not catching the gap.
- **Recommendation:** Update `inspector.config.yml` to pin an explicit plan list, or extend the enforcer to scan **all** `Plans/*/requirements.md` files and fail if any has an untraced ID. At minimum, document the correct invocation: `python3 tools/traceability-enforcer.py --plan dependency-linking`.
- **Cross-ref:** QO-001 (the hidden gap), CLAUDE.md Testing Rules

---

### QO-003: Silent JSON-Parse Swallow in API Client
- **Severity:** P3
- **Category:** pattern-violation
- **File:** Source/Frontend/src/api/client.ts:26
- **Detail:**
  ```js
  const body = await response.json().catch(() => ({}));
  ```
  On non-OK HTTP responses, if the server sends a body that isn't valid JSON (e.g., a plain-text error or empty body), `response.json()` throws and `catch(() => ({}))` silently replaces it with `{}`. The original parse error is permanently discarded. The resulting `Error` message falls back to `"Request failed: {status}"` with no information about what the server actually sent. This violates the architecture rule: *"Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* No comment explains the suppression.
- **Recommendation:** Add a comment documenting the intent, or log the parse error before suppressing:
  ```js
  const body = await response.json().catch(() => {
    // Non-JSON error body (e.g., plain text or empty) — fall back to empty object
    return {};
  });
  ```
  This satisfies the rule's "explicitly document why suppressed" clause.
- **Cross-ref:** CLAUDE.md Architecture Rules ("Never swallow errors silently")

---

### QO-004: eslint-disable Suppressing react-hooks/exhaustive-deps in Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** Source/Frontend/src/components/DependencyPicker.tsx:82, Source/Frontend/src/hooks/useWorkItems.ts:63
- **Detail:** Two production files disable the `react-hooks/exhaustive-deps` lint rule rather than fixing the hook dependency arrays. In `DependencyPicker.tsx` the suppressed `useCallback` for `handleAdd` omits `workItemsApi` from its deps (stable module ref — low risk but still technical debt). In `useWorkItems.ts` the suppressed `useEffect` selectively lists individual `filters.*` keys — a workaround for reference equality issues that should instead use `useCallback`/`useMemo` on the filters object. Both patterns can lead to stale closures if the code evolves and the suppressed rule hides the problem.
- **Recommendation:** Fix the dependency arrays or extract stable refs via `useCallback`/`useMemo` at the call site so the suppression is no longer needed.
- **Cross-ref:** CLAUDE.md Architecture Rules (no disabled linting rules)

---

### QO-005: Spec Nomenclature Split — FR-WF-* IDs Come from Plans/, Not Specifications/
- **Severity:** P4 (informational)
- **Category:** architecture-violation (traceability discipline)
- **File:** Source/Backend/src/*.ts, Source/Frontend/src/**/*.tsx
- **Detail:** CLAUDE.md states *"Specs are source of truth — implementation traces to specs, never the other way around."* The implementation traces to `FR-WF-001…FR-WF-013` which are defined in `Plans/self-judging-workflow/requirements.md`, not in any file under `Specifications/`. The canonical domain spec `Specifications/workflow-engine.md` defines the same system but uses prose, not numbered FR-XXX IDs. The Plans file correctly mirrors the spec; this is acceptable given the project's current scale, but means `Specifications/workflow-engine.md` has no requirement IDs and cannot be mechanically traced.
- **Recommendation:** Either add FR-WF-XXX IDs to `Specifications/workflow-engine.md` (making Plans a subset of Specs), or formally note in CLAUDE.md that Plans/*/requirements.md is the traceability target. Currently ambiguous.
- **Cross-ref:** CLAUDE.md "Specs are source of truth"; Specifications/workflow-engine.md

---

```json
{
  "audit_date": "2026-09-26",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "self_judging_workflow": { "total": 13, "traced": 13, "pct": 100 },
    "dependency_linking": { "total": 16, "traced": 15, "pct": 94 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift", "status": "OPEN",
      "title": "FR-dependency-seed unimplemented — no seed.ts, no Verifies comment" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation",
      "status": "OPEN",
      "title": "Enforcer auto-selects stale plan; dependency-linking gap hidden from CI gate" },
    { "id": "QO-003", "severity": "P3", "category": "pattern-violation", "status": "OPEN",
      "title": "Silent catch(() => ({})) in api/client.ts:26 violates no-swallow rule" },
    { "id": "QO-004", "severity": "P3", "category": "pattern-violation", "status": "OPEN",
      "title": "eslint-disable react-hooks/exhaustive-deps in 2 production files" },
    { "id": "QO-005", "severity": "P4", "category": "architecture-violation",
      "status": "INFORMATIONAL",
      "title": "FR-WF-* IDs originate from Plans/ not Specifications/ — traceability chain incomplete" }
  ],
  "grade": "B",
  "grade_rationale": "0 P1s, 2 P2s, spec coverage 94% on active plans. Meets B threshold (max_p2: 8, min_spec_coverage: 60).",
  "escalation": null
}
```

---

**Grade: B**

The active codebase is in good shape with no P1 issues. Two P2s require attention before the dependency-linking feature can be considered fully shipped: the unimplemented `FR-dependency-seed` and the masking of that gap by the traceability enforcer's plan-selection logic. Three pattern violations (P3/P4) are straightforward clean-ups. Architecture boundaries (no Express in services, no `console.log` in production, no hardcoded secrets) are cleanly maintained. Route to **TheFixer** for QO-001 and QO-002.
