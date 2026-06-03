---

## Quality Oracle Findings

**Audit date:** 2026-06-03  
**Enforcer result:** PASS (self-judging workflow plan) — but this is misleading; see QO-001.

---

### Spec Coverage Summary

| Spec domain | Requirements | Traced | % |
|-------------|-------------|--------|---|
| Self-judging workflow (`FR-WF-*`) | 13 | 13 | **100%** ✅ |
| Dev-workflow-platform (`FR-001..069`, `FR-DUP-*`, `FR-070..095`) | ~95 | ~92 | **~97%** ✅ |
| Tiered merge pipeline (`FR-TMP-001..010`) | 10 | **0** | **0%** ❌ |
| Dependency linking (`FR-dependency-*` × 16) | 16 | 13 | **81%** |
| **Overall** | **~134** | **~118** | **~88%** |

**Enforcer-reported coverage:** 13/13 = 100% — a **false green** caused by the enforcer's blind spot (see QO-001).

---

### QO-001: Traceability Enforcer is Blind to `portal/`

- **Severity:** P1
- **Category:** spec-drift / tooling-failure
- **File:** `tools/traceability-enforcer.py:73` (`source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer scans only `Source/` and `E2E/`. The entire `portal/` directory — which implements FR-001 through FR-095, all `FR-DUP-*`, and all `FR-dependency-*` portal-side code — is never scanned. Running `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` reports **34 missing requirements** that are **all false negatives** (they exist in portal/ but are invisible to the tool). This means real traceability gaps in the portal app cannot be detected by the CI gate.
- **Recommendation:** Add `"portal"` to `source_dirs` in `check_traceability()` at line 73. Also fix the false-positive issue: the regex `FR-[A-Z0-9-]+` matches data IDs like `FR-0004` from seed data descriptions — tighten to `\bFR-[A-Z]+(?:-[A-Z0-9]+)+\b` or exclude numeric-only suffixes.
- **Cross-ref:** TheFixer should own the code change; re-run all plan requirements files after the fix.

---

### QO-002: `Specifications/tiered-merge-pipeline.md` Has Zero Implementation

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010)
- **Detail:** The tiered merge pipeline spec (risk classification, Playwright E2E generation, live E2E runner, auto-PR creation, AI PR review, auto-merge logic) defines 10 functional requirements. There is **zero `// Verifies: FR-TMP-*` comment anywhere** in `Source/` or `portal/`. No git history indicates these were ever partially implemented. The spec was authored (it lives in `Specifications/` as canonical truth) but no implementation work was ever started or tracked in Plans/.
- **Recommendation:** Either (a) create a `Plans/tiered-merge-pipeline/requirements.md` and schedule implementation, or (b) move the spec to a `Specifications/future/` archive if it is deferred. Do not leave an unimplemented spec in the canonical `Specifications/` directory — it creates false expectations.
- **Cross-ref:** Team leader should decide scope; TheATeam for implementation.

---

### QO-003: `FR-dependency-api-types` — `blocked_by` Missing from PATCH Input Types

- **Severity:** P2
- **Category:** spec-drift / type-safety
- **File:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59` (`UpdateBugInput`); downstream: `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- **Detail:** `FR-dependency-api-types` requires `blocked_by?: string[]` on both update input types so the PATCH body is type-safe end-to-end. Both interfaces are missing this field. `DependencyPicker.tsx` compensates with `as any` casts at lines 291 and 293 to compile. The plan's own Implementation Delta marks this ❌ Missing. TypeScript is providing no type-checking on the `blocked_by` field in the PATCH flow.
- **Recommendation:** Add `blocked_by?: string[];` to `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`; remove both `as any` casts in `DependencyPicker.tsx`.
- **Cross-ref:** api-contract role; TheFixer pipeline.

---

### QO-004: `FR-dependency-frontend-tests` — Two Test Files Missing in `portal/Frontend`

- **Severity:** P2
- **Category:** untested
- **File:** `portal/Frontend/tests/` (DependencySection.test.tsx and BlockedBadge.test.tsx are absent)
- **Detail:** FR-dependency-frontend-tests requires tests for both `DependencySection` and `BlockedBadge` components. `portal/Frontend/tests/` contains `DependencyPicker.test.tsx` but neither `DependencySection.test.tsx` nor `BlockedBadge.test.tsx`. Both components are used in production (integrated into BugDetail and FeatureRequestDetail). The plan's own Implementation Delta marks this ❌ Missing.
- **Recommendation:** Create `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` per plan spec; each test must carry `// Verifies: FR-dependency-section` or `FR-dependency-blocked-badge` traceability comments.
- **Cross-ref:** frontend-coder; TheFixer pipeline.

---

### QO-005: `FR-dependency-seed` — No Seed File in `portal/Backend`

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (seed.ts missing; only `connection.ts` and `schema.ts` exist)
- **Detail:** FR-dependency-seed requires an idempotent `seed.ts` that inserts known dependency relationships on startup. Without it: BUG-0010 has no blockers, FR-0004/0005/0007 have no blockers, and the dependency UI shows no data on a fresh install. Manual testing of the dependency feature requires manually inserting data, making integration tests unreliable. The plan's own Implementation Delta marks this ❌ Missing.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with the 4 described dependency relationships; call from server startup guarded by idempotency check.
- **Cross-ref:** backend-coder; TheFixer pipeline.

---

### QO-006: `Source/metrics.ts` Missing `dependencyCheckDuration` Histogram

- **Severity:** P2
- **Category:** spec-drift / observability
- **File:** `Source/Backend/src/metrics.ts` (lines 40-62)
- **Detail:** `FR-dependency-metrics` requires four metrics: `dependency_operations_total` (counter), `dispatch_gating_events_total` (counter), `cycle_detection_events_total` (counter), and `dependency_check_duration_seconds` (histogram). `Source/Backend/src/metrics.ts` defines only the first three. The histogram is absent from the Source/ app even though `portal/Backend/src/metrics.ts` correctly defines it. The metrics test (`Source/Backend/tests/routes/metrics.test.ts`) also only asserts on the three counters, so the gap is not caught by tests.
- **Recommendation:** Add a `Histogram` for `dependency_check_duration_seconds` to `Source/Backend/src/metrics.ts`; add a corresponding assertion in the metrics test.
- **Cross-ref:** backend-coder.

---

### QO-007: Empty Catch Blocks Swallow Errors (Architecture Violation)

- **Severity:** P3
- **Category:** pattern-violation / architecture-violation
- **Files:**
  - `portal/Frontend/src/components/bugs/BugDetail.tsx:82` — `.catch(() => {})`
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80` — `.catch(() => {})`
  - `portal/Frontend/src/components/common/RepoSelector.tsx:20` — `.catch(() => {})`
- **Detail:** CLAUDE.md architecture rule: *"Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* All three locations catch errors and discard them with no logging, no re-throw, and no comment explaining why suppression is intentional.
- **Recommendation:** Replace `.catch(() => {})` with either a logger call (e.g., `.catch((err) => logger.warn({ err }, 'op failed'))`) or, if genuinely fire-and-forget, add a comment: `// intentionally ignored — refresh will pick up state on next render`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-008: Duplicate Test Files Cover Same FR in `Source/Frontend`

- **Severity:** P3
- **Category:** test-quality
- **Files:**
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (both cover FR-WF-010)
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (both cover FR-WF-011)
- **Detail:** The top-level `tests/` copies appear to be earlier versions superseded by the `tests/pages/` copies (which are more complete). Both versions run in CI, doubling runtime and causing confusion about the authoritative test location. Divergences between the two sets could mask regressions.
- **Recommendation:** Delete the top-level duplicates (`tests/WorkItemListPage.test.tsx`, `tests/WorkItemDetailPage.test.tsx`) and keep only the `tests/pages/` versions.
- **Cross-ref:** TheFixer.

---

### QO-009: Traceability Enforcer Produces False Positives on Some Plan Files

- **Severity:** P3
- **Category:** tooling
- **File:** `tools/traceability-enforcer.py:61` (regex `FR-[A-Z0-9-]+`)
- **Detail:** Running the enforcer against `Plans/dependency-linking/requirements.md` reports 7 spurious failures: `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` (extracted from seed data examples: "FR-0004 blocked_by FR-0003"), and `FR-070`, `FR-085` (extracted from a spec cross-reference sentence). These are not requirement IDs — they are data IDs and prose references. The regex is too broad: it matches `FR-` followed by any alphanumerics, including zero-padded numbers that are entity IDs, not spec IDs.
- **Recommendation:** Tighten the extraction regex or add an exclusion for patterns that don't follow the project's naming conventions. Consider an allowlist approach: only extract IDs that appear in a `| FR-xxx |` table cell.

---

### QO-010: Large Production Files Approaching Split Threshold

- **Severity:** P3
- **Category:** pattern-violation
- **Files** (production src, >500 lines):
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — 550 lines
  - `portal/Frontend/src/components/bugs/BugDetail.tsx` — 546 lines
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Frontend/src/api/client.ts` — 525 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
- **Detail:** CLAUDE.md threshold is 500 lines. All five are over the threshold. Large files are harder to review, harder to test in isolation, and concentrate too many concerns. `cycleService.ts` and `featureRequestService.ts` in particular likely contain business logic mixed with persistence concerns.
- **Recommendation:** Split on next touch: extract sub-components for the detail views; extract a `pipelineService` helper from `cycleService.ts`.

---

### QO-011: `eslint-disable` Suppressions Without Justification

- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — same
  - `portal/Frontend/src/hooks/useApi.ts:35` — same
- **Detail:** Each suppression silences a `react-hooks/exhaustive-deps` warning with no comment explaining why the dependency array is intentionally incomplete. Stale closures in hooks are a common source of subtle bugs.
- **Recommendation:** Add a comment per suppression explaining the intent (e.g., `// only run on mount — refresh is triggered by user action`).

---

## JSON Summary

```json
{
  "audit_date": "2026-06-03",
  "grade": "C",
  "spec_coverage_pct": 88,
  "p1_count": 2,
  "p2_count": 4,
  "p3_count": 4,
  "p4_count": 1,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "tooling-failure", "title": "Enforcer blind to portal/", "status": "OPEN" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "FR-TMP-001..010 zero implementation", "status": "OPEN" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "blocked_by missing from PATCH input types", "file": "portal/Shared/api.ts:32,59", "status": "OPEN" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "DependencySection and BlockedBadge test files missing", "file": "portal/Frontend/tests/", "status": "OPEN" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed: no seed.ts", "file": "portal/Backend/src/database/", "status": "OPEN" },
    { "id": "QO-006", "severity": "P2", "category": "observability", "title": "Source/metrics.ts missing dependencyCheckDuration histogram", "file": "Source/Backend/src/metrics.ts", "status": "OPEN" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "Empty catch blocks swallow errors (3 locations)", "status": "OPEN" },
    { "id": "QO-008", "severity": "P3", "category": "test-quality", "title": "Duplicate test files for FR-WF-010/011", "status": "OPEN" },
    { "id": "QO-009", "severity": "P3", "category": "tooling", "title": "Enforcer false positives on seed data IDs", "status": "OPEN" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "5 production files exceed 500-line threshold", "status": "OPEN" },
    { "id": "QO-011", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable without justification comments", "status": "OPEN" }
  ],
  "escalations": [
    { "finding": "QO-001", "route": "TheFixer", "reason": "enforcer source_dirs needs portal/ added" },
    { "finding": "QO-002", "route": "TheATeam + team-leader", "reason": "scoping decision required" },
    { "finding": "QO-007", "route": "TheFixer", "reason": "architecture rule violation in active components" }
  ]
}
```

---

**Grade: C** — 2 P1 findings (enforcer gap + unimplemented spec), 4 P2 findings, ~88% true spec coverage. The project is well-traced within its implemented scope, but the tooling blindspot prevents confident enforcement of the larger spec surface, and FR-TMP-001..010 represent an entire specification with no code behind it.
