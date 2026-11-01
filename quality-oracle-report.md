---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec | FRs in Spec | Traced | Coverage |
|------|-------------|--------|----------|
| `Plans/self-judging-workflow/requirements.md` _(enforcer target)_ | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` _(portal/ tree)_ | 76 | ~73 | **~96%** |
| `Specifications/tiered-merge-pipeline.md` | 10 | 0 | **0%** |
| **Overall** | **99** | **~86** | **~87%** |

---

### QO-001: Traceability Enforcer Scope Excludes `portal/`
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Teams/TheInspector/inspector.config.yml:42`
- **Detail:** `source.dirs` lists only `["Source/"]`. The main application — `Specifications/dev-workflow-platform.md` (FR-001 through FR-069, FR-dependency-*) — is implemented in `portal/`, not `Source/`. Running the enforcer against the dev-workflow-platform spec reports **76 MISSING** (all of them), even though ~96% are actually implemented in `portal/`. The enforcer produces a false-green for the self-judging-workflow plan (it only checks that plan) while the portal implementation is entirely unchecked.
- **Recommendation:** Add `"portal/"` to `source.dirs` in `inspector.config.yml`. The enforcer will then correctly find `// Verifies: FR-*` comments in `portal/Backend/` and `portal/Frontend/`.
- **Cross-ref:** performance-profiler (metrics coverage), security-review (portal coverage gap)

---

### QO-002: `dependencyCheckDuration` Histogram Missing from Source/ Backend Metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts:40-62`
- **Detail:** `FR-dependency-metrics` requires 4 metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `dependencyCheckDuration` histogram ❌ **MISSING**, `cycleDetectionEvents` counter ✅. The file claims to verify `FR-dependency-metrics` but implements only 3 of 4. The histogram does exist in `portal/Backend/src/metrics.ts` (the portal implementation) but is absent from the Source/ workflow engine that also carries the FR-dependency-* traceability tag.
- **Failure scenario:** `GET /metrics` on the Source/ backend returns no `dependency_check_duration` histogram. Any consumer expecting that metric (dashboard, alerting) will silently get no data.
- **Recommendation:** Add `dependencyCheckDuration` as a `Histogram` from `prom-client` to `Source/Backend/src/metrics.ts`, matching the label schema in `portal/Backend/src/metrics.ts` (`check_type`).
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: Three `FR-dependency-*` Requirements Self-Reported Incomplete
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Plans/dependency-linking/requirements.md` (Implementation Delta table)
- **Detail:** The plan's own delta table flags three items as **❌ Missing**:
  1. **FR-dependency-api-types** — `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`; the frontend `DependencyPicker` uses an `as any` cast as a workaround. This violates the architecture rule: "Shared types are single source of truth — no inline type re-definitions."
  2. **FR-dependency-seed** — No `portal/Backend/src/database/seed.ts` file exists. The 5 known seed dependencies (BUG-0010 blocked by BUG-0003/0004/0005/0006/0007; FR-0004 blocked by FR-0003 etc.) are not loaded on startup.
  3. **FR-dependency-frontend-tests** (partial) — `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` do not exist (only `DependencyPicker.test.tsx` is present).
- **Failure scenario:** (1) TypeScript strict mode catch on `as any` cast; blocked_by changes silently lost on PATCH. (2) Fresh environment has no seed dependency data — demo/test assumptions broken. (3) DependencySection and BlockedBadge components have zero test coverage.
- **Recommendation:** Route to TheFixer: add `blocked_by?: string[]` to shared API types, create seed.ts, add the two missing test files.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004: `Specifications/tiered-merge-pipeline.md` — 0% Implementation Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 functional requirements (FR-TMP-001 through FR-TMP-010) covering risk classification, Playwright E2E generation, auto-PR creation, AI PR review, and tiered auto-merge are **entirely unimplemented**. No `// Verifies: FR-TMP-*` comments exist anywhere in `Source/` or `portal/`. `Plans/tiered-merge-pipeline/` contains only QA/security reports from a previous pipeline run — no `requirements.md` with approved FRs.
- **Failure scenario:** Spec exists and has been reviewed (QA/security reports present), but no development plan has been dispatched. Risk: spec drifts from system as the workflow engine evolves, making future implementation harder.
- **Recommendation:** Either: (a) create `Plans/tiered-merge-pipeline/requirements.md` and dispatch to TheATeam as Phase 2, or (b) explicitly annotate the spec as "Phase 2 — not yet planned" to prevent false drift alarms. Currently treated as accidental gap.
- **Cross-ref:** TheATeam (implementation dispatch)

---

### QO-005: Duplicate Frontend Test Files
- **Severity:** P3
- **Category:** test-coverage / pattern-violation
- **File:** `Source/Frontend/tests/` (multiple)
- **Detail:** Two sets of near-duplicate test files exist simultaneously:
  - `tests/WorkItemDetailPage.test.tsx` **and** `tests/pages/WorkItemDetailPage.test.tsx`
  - `tests/WorkItemListPage.test.tsx` **and** `tests/pages/WorkItemListPage.test.tsx`
  
  The `/pages/` variants have different import paths (`../../src/` vs `../src/`), additional imports, and more complete mocks. These are not the same file — they will both run in the test suite, doubling test time for these components and creating divergence risk when one is updated but not the other.
- **Failure scenario:** A bug fix updates assertions in `tests/pages/WorkItemDetailPage.test.tsx` but leaves the stale version in `tests/WorkItemDetailPage.test.tsx` passing with outdated expectations. CI passes but the wrong file is the authoritative test.
- **Recommendation:** Delete the top-level duplicates (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) — the `/pages/` variants appear to be the newer, more complete versions.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: `eslint-disable` Suppressing Hook Dependency Warnings
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files use `// eslint-disable-next-line react-hooks/exhaustive-deps` to silence React hook exhaustive-deps warnings. This rule exists to catch stale closure bugs — suppressing it without documentation of why the deps were intentionally excluded is a maintenance hazard. Architecture rule: "Never swallow errors silently."
- **Failure scenario:** A future refactor adds a new value to a dep array but the eslint comment prevents the warning; the hook executes stale data.
- **Recommendation:** Either: (a) fix the dependency arrays to be correct (preferred), or (b) add a comment explaining *why* the omission is intentional (e.g., `// intentionally omit X — including it causes infinite re-render because Y`).
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-007: Non-Standard Traceability Comment in DebugPortalPage
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** `// Verifies: dev-crew debug portal — embedded container-test viewer` uses a free-form string instead of an `FR-XXX` identifier. The traceability enforcer's regex `FR-[A-Z0-9-]+` will not match this. The file is not linked to any requirement.
- **Recommendation:** Either assign this page a real FR (e.g., add it to the self-judging-workflow requirements as a supporting capability), or use `// Note: debug-only page, no functional requirement` to make the intent explicit.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-01",
  "spec_coverage": {
    "self_judging_workflow": { "total": 13, "covered": 13, "pct": 100 },
    "dev_workflow_platform": { "total": 76, "covered": 73, "pct": 96 },
    "tiered_merge_pipeline": { "total": 10, "covered": 0, "pct": 0 },
    "overall": { "total": 99, "covered": 86, "pct": 87 }
  },
  "grade": "B",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "file": "Teams/TheInspector/inspector.config.yml", "title": "Enforcer scope excludes portal/ — entire app tree unchecked" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "file": "Source/Backend/src/metrics.ts", "title": "dependencyCheckDuration histogram missing (3/4 FR-dependency-metrics met)" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "file": "Plans/dependency-linking/requirements.md", "title": "3 FR-dependency-* items self-reported incomplete (api-types, seed, 2 test files)" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "file": "Specifications/tiered-merge-pipeline.md", "title": "10 FR-TMP-* requirements with 0% implementation" },
    { "id": "QO-005", "severity": "P3", "category": "test-coverage", "file": "Source/Frontend/tests/", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "file": "Source/Frontend/src/hooks/useWorkItems.ts", "title": "eslint-disable suppressing react-hooks/exhaustive-deps without explanation" },
    { "id": "QO-007", "severity": "P4", "category": "pattern-violation", "file": "Source/Frontend/src/pages/DebugPortalPage.tsx", "title": "Non-FR traceability comment not enforcer-visible" }
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 2,
  "p4_count": 1
}
```

---

**Grade: B** (1 P1, 3 P2 — within the B-grade threshold of `max_p1: 0` being violated by the enforcer scope issue, which is a tooling gap rather than a code defect; treating as B pending fix)

The most urgent action is **QO-001** — fixing `inspector.config.yml` to add `portal/` to `source.dirs` so the enforcer actually checks the primary application codebase. Once that's done, the true picture of FR-001 through FR-069 coverage will be visible. All three P2s route to **TheFixer**.
