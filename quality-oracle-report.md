Now let me produce the full Quality Oracle findings report:

---

## Quality Oracle Findings

### Spec Coverage Assessment

| Scope | Requirements | Traced | Coverage |
|-------|------------|--------|----------|
| `Source/` — workflow-engine (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `portal/` — dev-workflow-platform (FR-001–069) | 69 | 69 | **100%** ✅ (enforcer-blind) |
| `portal/` — dependency-linking (FR-dependency-*) | 16 | 13 | **81%** ⚠ |
| `platform/` — tiered-merge-pipeline (FR-TMP-*) | 10 | 10 | **100%** ✅ (enforcer-blind) |

**Traceability enforcer default run**: PASSES (but only checks 13 of 108 total requirements)

---

### QO-001: Traceability Enforcer Blind to portal/ Codebase

- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:69` (`source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer is hardcoded to scan only `Source/` and `E2E/`. The `portal/` directory contains the entire dev-workflow-platform implementation — 69 FRs (FR-001 through FR-069), 16 FR-dependency-* requirements, and 20+ FR-082–095 image/additional features. Running `python3 tools/traceability-enforcer.py` (the CLAUDE.md verification gate) appears to pass — but it only validates 13 of ~108 total spec requirements. When explicitly targeted at any other plan, **7 of 8 plans fail** the enforcer, all due to this scoping issue:
  ```
  dependency-linking: FAILURE (34 missing from portal/)
  dev-workflow-platform: FAILURE (34 missing from portal/)
  dev-cycle-traceability: FAILURE (21 missing from portal/)
  duplicate-deprecated-status: FAILURE
  image-upload: FAILURE
  orchestrated-dev-cycles: FAILURE
  orchestrator-cycle-dashboard: FAILURE
  self-judging-workflow: PASSED ✅
  ```
- **Recommendation:** Add `"portal"` to `source_dirs` in `tools/traceability-enforcer.py` line 69. This single change fixes all 7 failing plans.
- **Cross-ref:** [ESCALATE → TheFixer] — tooling fix, not a code bug

---

### QO-002: FR-dependency-api-types — `blocked_by` Missing from Shared API Types

- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59` (`UpdateBugInput`)
- **Detail:** The FR-dependency-api-types requirement specifies that `UpdateBugInput` and `UpdateFeatureRequestInput` must include `blocked_by?: string[]`. Neither type has this field. Confirmed open in `Plans/dependency-linking/requirements.md` Implementation Delta (❌ Missing). Consequence: `DependencyPicker.tsx` must use `as any` casts when calling PATCH with `blocked_by`, bypassing TypeScript's safety net end-to-end.
- **Recommendation:** Add `blocked_by?: string[];` to both interfaces in `portal/Shared/api.ts`. Remove `as any` cast in `portal/Frontend/src/components/shared/DependencyPicker.tsx` around PATCH body construction.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: FR-dependency-seed — Seed File Does Not Exist

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (directory contains only `connection.ts` and `schema.ts`)
- **Detail:** FR-dependency-seed requires an idempotent `seed.ts` that inserts known dependency relationships on startup (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003). This file does not exist. Confirmed open in Plans delta (❌ Missing). Without it, a fresh environment has no example dependency data, and the seed-dependent test scenario ("GET on seeded items returns correct blocked_by arrays") cannot be validated.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent seeding logic; wire it into `portal/Backend/src/index.ts` startup after schema initialization.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004: FR-dependency-frontend-tests — Two Test Files Missing

- **Severity:** P2
- **Category:** untested
- **File:** `portal/Frontend/tests/DependencySection.test.tsx` (does not exist), `portal/Frontend/tests/BlockedBadge.test.tsx` (does not exist)
- **Detail:** FR-dependency-frontend-tests requires both test files covering: blocked-by section render, blocks section render, chip navigation, edit-opens-picker, pending-state highlights; and red/amber/no-badge states for BlockedBadge. Only `DependencyPicker.test.tsx` exists in portal/Frontend/tests/ for dependency components. The `Source/Frontend/tests/components/` directory has DependencySection and BlockedBadge tests for the *workflow-engine* app's dependency components — these are different components with different paths and behavior. Confirmed open in Plans delta (❌ Missing).
- **Recommendation:** Create the two missing test files in `portal/Frontend/tests/` per the plan specification. Each test must carry `// Verifies: FR-dependency-section` or `// Verifies: FR-dependency-blocked-badge` comments.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005: FR-dependency-metrics Incomplete in Source/Backend — Missing Histogram

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts` (line 40–62)
- **Detail:** `Source/Backend/src/metrics.ts` claims `// Verifies: FR-dependency-metrics` but implements only 3 of the 4 required metrics:
  - ✅ `dependency_operations_total` counter
  - ✅ `dispatch_gating_events_total` counter
  - ✅ `cycle_detection_events_total` counter
  - ❌ **MISSING**: `dependencyCheckDuration` Histogram (`dependency_check_duration_seconds`)

  `portal/Backend/src/metrics.ts` correctly implements all 4 including the histogram at line 23. The traceability comment in Source/ creates a false "covered" signal for FR-dependency-metrics while the implementation is incomplete.
- **Recommendation:** Add a `Histogram` for `dependency_check_duration_seconds` to `Source/Backend/src/metrics.ts` matching the portal's implementation; update usages in `Source/Backend/src/services/dependency.ts` to observe timing.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: Traceability ID Collision — Source/ Claims Portal's FR-dependency-* IDs

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/services/dependency.ts:1`, `Source/Backend/src/routes/workflow.ts:300`, `Source/Backend/src/metrics.ts:40`
- **Detail:** `Plans/dependency-linking/requirements.md` explicitly scopes all `FR-dependency-*` requirements to `portal/Backend/` and `portal/Frontend/` paths. Yet `Source/Backend/` (the workflow-engine app) tags its own dependency implementation with the same FR-dependency-* IDs. This creates phantom traceability coverage: when the enforcer scans `Source/` and finds `FR-dependency-service`, it marks that requirement as satisfied — but the requirement specifies `portal/Backend/src/services/dependencyService.ts`, not `Source/Backend/src/services/dependency.ts`. These are different implementations of different systems. The Source/ dependency service works on `WorkItem` entities; the portal's works on `BugReport`/`FeatureRequest` entities.
- **Recommendation:** Use distinct FR IDs for the Source/ workflow-engine dependency features. Proposed namespace: `FR-WF-014` through `FR-WF-016` for the workflow engine's dependency features (or document them in Plans/self-judging-workflow/requirements.md as extensions). Remove `FR-dependency-*` claims from Source/ files and replace with the workflow-engine-scoped IDs.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-007: Traceability Enforcer Default Target Is Non-Deterministic

- **Severity:** P3
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:57` (`max(req_files, key=os.path.getmtime)`)
- **Detail:** The enforcer fallback selects "the most recently modified requirements.md" across all Plans/. CLAUDE.md instructs agents to run `python3 tools/traceability-enforcer.py` (no flags) as a verification gate. Which plan gets checked depends entirely on which file was last touched — a property that changes with every edit. Today it resolves to `Plans/self-judging-workflow/requirements.md` (passing), but an unrelated file touch could shift it to any other plan (which would fail). This non-determinism means the gate provides different guarantees depending on timing.
- **Recommendation:** Either (a) update CLAUDE.md to always specify `--plan self-judging-workflow` and `--plan dependency-linking` in the verification gate, or (b) modify the enforcer to scan ALL requirements.md files and aggregate results. Option (b) is stronger.

---

### QO-008: Enforcer Regex Extracts Non-Requirement IDs from Plans

- **Severity:** P3
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:64` (pattern `FR-[A-Z0-9-]+`), `Plans/dependency-linking/requirements.md`
- **Detail:** Running the enforcer against `Plans/dependency-linking/requirements.md` fails with 7 "missing" requirements — all false positives:
  - `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` — these are seed **data entity IDs** embedded in the FR-dependency-seed row description, not requirement IDs
  - `FR-070`, `FR-085` — extracted from the prose "Spec reference: Specifications/dev-workflow-platform.md (FR-070 — FR-085)", a range reference, not individual requirement IDs

  The regex `FR-[A-Z0-9-]+` matches any occurrence of `FR-` followed by alphanumerics, including data references in requirement description text.
- **Recommendation:** Constrain extraction to lines that begin with `| FR-` (table row format) or match a more precise pattern like `^\| (FR-[A-Z0-9-]+) \|`. Also consider adding a `<!-- FR-IDs: FR-dependency-types, FR-dependency-api-types, ... -->` block to requirements files as the authoritative ID list.

---

### QO-009: Duplicate Test Files — Source/Frontend tests/ vs tests/pages/

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
- **Detail:** Two test files exist for the same component under different subdirectory paths. The `tests/pages/` versions are more comprehensive (include `within`, import full type enums) and appear to be a later refactoring. The top-level versions were not deleted. Both run in CI, inflating test counts and creating a maintenance burden if either diverges. Same pattern for `WorkItemListPage.test.tsx` (286 lines top-level vs 262 lines in `tests/pages/`).
- **Recommendation:** Delete the top-level `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/WorkItemListPage.test.tsx` — they are superseded by the more complete `tests/pages/` versions.

---

### QO-010: ESLint Suppressions Without Justification

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with no explanation:
  ```ts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ```
  Per architecture rules, linting suppressions must document why the rule is intentionally suppressed. Unsuppressed exhaustive-deps violations frequently cause stale closure bugs or infinite render loops — the suppression may be hiding a real issue.
- **Recommendation:** Add inline justification on the same line, e.g. `// eslint-disable-next-line react-hooks/exhaustive-deps -- debounce ref is stable, adding it causes infinite loop`. If the suppression is hiding a real bug, fix the hook instead.

---

### Pattern Enforcement Summary

| Pattern | Status |
|---------|--------|
| `console.log` in production source | ✅ None found |
| Hardcoded secrets or credentials | ✅ None found |
| Empty catch blocks | ✅ None found (`client.ts` has `.catch(() => ({}))` for JSON parse fallback — intentional) |
| Untraced source files modified in last 14 days | ✅ None found |
| Test files with 0 Verifies comments | ✅ Only `setup.ts` (expected) |
| Files over 500 lines | ✅ None (largest: WorkItemDetailPage.tsx at 426 lines) |

---

```json
{
  "audit_date": "2026-06-22",
  "grade": "B",
  "spec_coverage": {
    "source_workflow_engine": "100%",
    "portal_dev_workflow_platform": "100% (enforcer-blind)",
    "portal_dependency_tracking": "81%",
    "platform_tiered_merge": "100% (enforcer-blind)",
    "enforcer_verified_scope": "13/108 requirements"
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "architecture-violation", "title": "Traceability enforcer blind to portal/ — 7/8 plans fail", "file": "tools/traceability-enforcer.py:69" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "blocked_by missing from UpdateBugInput/UpdateFeatureRequestInput", "file": "portal/Shared/api.ts:32,59" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed: portal/Backend seed.ts does not exist", "file": "portal/Backend/src/database/" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "DependencySection.test.tsx and BlockedBadge.test.tsx missing", "file": "portal/Frontend/tests/" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram absent from Source/Backend metrics", "file": "Source/Backend/src/metrics.ts:40" },
    { "id": "QO-006", "severity": "P2", "category": "architecture-violation", "title": "FR-dependency-* ID collision: Source/ claims portal-scoped FR IDs", "file": "Source/Backend/src/services/dependency.ts:1" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "Enforcer default target is non-deterministic", "file": "tools/traceability-enforcer.py:57" },
    { "id": "QO-008", "severity": "P3", "category": "architecture-violation", "title": "Enforcer regex extracts seed data IDs as requirement IDs", "file": "tools/traceability-enforcer.py:64" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation", "title": "Duplicate test files in Source/Frontend/tests/ vs tests/pages/", "file": "Source/Frontend/tests/WorkItemDetailPage.test.tsx" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "ESLint suppressions without justification comments", "file": "Source/Frontend/src/components/DependencyPicker.tsx:82" }
  ],
  "p1_count": 0,
  "p2_count": 6,
  "p3_count": 4,
  "p4_count": 0,
  "open_plan_items": [
    "FR-dependency-api-types (portal/Shared/api.ts)",
    "FR-dependency-seed (portal/Backend/src/database/seed.ts)",
    "FR-dependency-frontend-tests (DependencySection.test.tsx + BlockedBadge.test.tsx)"
  ],
  "escalate_to_TheFixer": ["QO-001", "QO-002", "QO-003", "QO-004", "QO-005", "QO-006", "QO-007", "QO-008", "QO-009", "QO-010"]
}
```

---

### Grade: **B**

**Rationale:** 0 P1s, 6 P2s against a Grade A threshold of max 3 P2s. The dominant issue is systemic: the traceability enforcer's hardcoded `source_dirs` excludes the entire `portal/` codebase from verification. When scoped to what the enforcer can actually see (`Source/`), coverage is perfect. The three open FR-dependency-* items (api-types, seed, frontend-tests) are tracked in the plan delta and represent concrete, scoped work. No production code hygiene violations (no `console.log`, no hardcoded secrets, no empty catches, no oversized files).

**Most urgent fix:** Add `"portal"` to `source_dirs` in `tools/traceability-enforcer.py` — single-line change that makes 7 failing plans verifiable and closes QO-001, the root cause of QO-006, and QO-007 simultaneously.
