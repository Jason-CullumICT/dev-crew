Now the full findings report:

---

## Quality Oracle Findings
**Date:** 2026-05-15 | **Scope:** Full audit — all three specs + all source surfaces

---

### Spec Coverage Summary

| Specification | FRs | Covered | % |
|---|---|---|---|
| `dev-workflow-platform.md` (FR-001–069, portal/) | 69 | 69 | **100%** |
| `workflow-engine.md` (FR-WF-001–013, Source/) | 13 | 13 | **100%** |
| `tiered-merge-pipeline.md` (FR-TMP-001–010, platform/) | 10 | 9 | **90%** |
| `dependency-linking requirements` | 16 | 13 | **81%** |
| **Total** | **108** | **104** | **96.3%** |

---

### QO-001: Traceability Enforcer Only Scans `Source/` — False Failures for Portal and Platform
- **Severity:** P2
- **Category:** tooling / spec-drift
- **File:** `tools/traceability-enforcer.py` (hardcoded `source_dirs = ["Source", "E2E"]`)
- **Detail:** Running `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` reports all 32 FRs as MISSING — but all 69 are actually traced in `portal/`. Similarly `spec-drift-report.json` shows 0% for FR-TMP-* despite `platform/orchestrator/lib/workflow-engine.js` having full coverage. The CLAUDE.md gate says "run verification gates before marking any task done" — agents running the enforcer against portal plans will see false failures and may conclude work is incomplete when it's not, or worse, learn to ignore the gate.
- **Recommendation:** Add `"portal"` and `"platform"` to the `source_dirs` list in the enforcer, or add a config option so the dev-workflow-platform plan file can specify `source_dirs: ["portal", "portal/Backend/tests", "portal/Frontend/tests"]`.
- **Cross-ref:** Affects every team that ships portal/ work (TheATeam, TheFixer).

---

### QO-002: `FR-dependency-api-types` STILL OPEN — `blocked_by` Field Missing + `as any` Casts
- **Severity:** P2
- **Category:** spec-drift / unimplemented requirement
- **File:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59` (`UpdateBugInput`), `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- **Detail:** The `dependency-linking` requirements explicitly state: *"`UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` include `blocked_by?: string[]`; no `as any` casts needed in frontend."* The implementation delta in the plan file records this as ❌ Missing. Confirmed: neither type has `blocked_by`, and the DependencyPicker uses `as any` on both PATCH calls. This is an end-to-end type-safety gap — the API accepts the field but TypeScript won't catch type errors at the call site.
- **Recommendation:** Add `blocked_by?: string[];` to both `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`. Remove `as any` casts from `DependencyPicker.tsx` lines 291 and 293.
- **Cross-ref:** [ESCALATE → TheFixer] — simple 2-line type addition + 2-line cast removal.

---

### QO-003: `FR-dependency-seed` STILL OPEN — No Seed File for Required Dependency Data
- **Severity:** P2
- **Category:** spec-drift / unimplemented requirement
- **File:** `portal/Backend/src/database/` (no `seed.ts` present)
- **Detail:** The dependency-linking requirements specify: *"Create `portal/Backend/src/database/seed.ts`: idempotent seeding — BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003; called on server startup."* No such file exists. Fresh deployments will have the dependency UI features wired up but no example relationships to demonstrate or test against. The implementation delta in the plan file records this as ❌ Missing.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent dependency seeding. Wire into `portal/Backend/src/index.ts` after DB init.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### QO-004: Architecture Violation — Direct DB Calls in Route Handler
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37–43` (GET), `teamDispatches.ts:72–75` (POST)
- **Detail:** CLAUDE.md states: *"No direct DB calls from route handlers — use the service layer."* `teamDispatches.ts` calls `db.prepare(...).all()` and `db.prepare(...).run()` directly in the route handler bodies with no service abstraction. Every other route in the portal delegates to a service (e.g., `bugService`, `featureRequestService`, `dependencyService`). This entity is also unspecced (see QO-007).
- **Recommendation:** Extract a `teamDispatchService.ts` with `listDispatches(db, {team, limit})` and `createDispatch(db, data)` functions. Route handler calls service methods only.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### QO-005: `FR-dependency-frontend-tests` STILL OPEN — Two Portal Test Files Missing
- **Severity:** P3
- **Category:** untested / spec-drift
- **File:** `portal/Frontend/tests/DependencySection.test.tsx` (MISSING), `portal/Frontend/tests/BlockedBadge.test.tsx` (MISSING)
- **Detail:** The dependency-linking requirements specify two test files at `portal/Frontend/tests/`. The implementation delta records them as ❌ Missing. Note: `Source/Frontend/tests/components/DependencySection.test.tsx` **does** exist but covers the workflow-engine app's component — the portal `DependencySection` and `BlockedBadge` components are untested. `portal/Frontend/tests/DependencyPicker.test.tsx` exists and is covered.
- **Recommendation:** Create the two missing test files with traceability comments (`// Verifies: FR-dependency-section` / `// Verifies: FR-dependency-blocked-badge`).
- **Cross-ref:** [ESCALATE → TheFixer/frontend-coder].

---

### QO-006: `FR-TMP-008` Has No Traceability — Worker Container Prerequisites Untraced
- **Severity:** P3
- **Category:** spec-drift / untraced implementation
- **File:** `platform/` (no `// Verifies: FR-TMP-008` anywhere)
- **Detail:** FR-TMP-008 specifies that the worker Docker image must have `gh` CLI installed, Playwright must be installable, and `GITHUB_TOKEN` must pass through. While the runtime code in `workflow-engine.js` does implement playwright installation (FR-TMP-003), the Dockerfile.worker prerequisite (FR-TMP-008) is never referenced with a traceability comment. The spec coverage scan shows this as the sole gap in the tiered-merge-pipeline spec.
- **Recommendation:** Add `// Verifies: FR-TMP-008` comment to the relevant Dockerfile.worker section. If `gh` CLI isn't in the Dockerfile, that's also a gap to address.

---

### QO-007: Unspecced Features — `teamDispatches`, `TeamsPage`, `RepoSelector`
- **Severity:** P3
- **Category:** spec-drift / scope creep
- **Files:** `portal/Backend/src/routes/teamDispatches.ts`, `portal/Frontend/src/pages/TeamsPage.tsx`, `portal/Frontend/src/components/common/RepoSelector.tsx`
- **Detail:** These three files are recently added (within 14 days), have no `// Verifies:` comments, and correspond to no FR in any specification (`Specifications/`, `Plans/`, or standalone requirements). They represent untracked implementation — features built outside the spec-first workflow. CLAUDE.md principle: *"Every decision and line of code must trace back to a specification."*
- **Recommendation:** Either (a) write the FR(s) in `Specifications/dev-workflow-platform.md` and back-fill traceability comments, or (b) treat these as infrastructure/tooling and document why they're exempt in a spec note.

---

### QO-008: `eslint-disable` for `react-hooks/exhaustive-deps` in Production Code
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`, `portal/Frontend/src/hooks/useApi.ts:35`
- **Detail:** Three instances of `// eslint-disable-next-line react-hooks/exhaustive-deps`. Suppressing this rule is a common source of stale closure bugs where hooks don't re-run when dependencies change. Not a blocker but worth addressing.
- **Recommendation:** Review whether the disabled calls actually need the suppression. If intentional, add a comment explaining why the dependency is correctly excluded.

---

### QO-009: Recently Added Files Without Verifies Comments (Infrastructure)
- **Severity:** P4
- **Category:** untested / missing traceability
- **Files:** `Source/E2E/playwright.pipeline.config.ts`, `Source/Frontend/vite.config.ts`
- **Detail:** Both files are recently added (git log confirms within 14 days) and contain no `// Verifies:` comments. Build/config files aren't usually traced to FRs, but `playwright.pipeline.config.ts` directly implements FR-TMP-003 behavior (pipeline E2E execution config) and should be traced.
- **Recommendation:** Add `// Verifies: FR-TMP-003` to `playwright.pipeline.config.ts`. `vite.config.ts` is infrastructure — add a one-line comment explaining it's exempt.

---

### Overall Grade: **B**

| Criterion | Value | Threshold |
|---|---|---|
| P1 findings | 0 | max 0 ✅ |
| P2 findings | 4 | max 3 for A, max 8 for B |
| Spec coverage | 96.3% | min 80% for A ✅ |
| P3 findings | 3 | — |

Grade B: 4 P2s is one over the A threshold, all in known open items from the dependency-linking plan. No novel regressions. The core application architecture is solid — no console.log leakage, no hardcoded secrets, no swallowed errors, no skipped tests, service layer intact for all entities except `teamDispatches`.

---

```json
{
  "audit_date": "2026-05-15",
  "grade": "B",
  "spec_coverage_pct": 96.3,
  "total_frs": 108,
  "covered_frs": 104,
  "missing_frs": ["FR-TMP-008", "FR-dependency-api-types", "FR-dependency-seed", "FR-dependency-frontend-tests (portal)"],
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "tooling", "title": "Traceability enforcer misses portal/ and platform/ — false failures", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-api-types open — blocked_by missing + as-any casts", "files": ["portal/Shared/api.ts", "portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293"] },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed open — no seed.ts in portal/Backend/src/database/", "file": "portal/Backend/src/database/" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "teamDispatches.ts uses direct DB calls in route handler", "file": "portal/Backend/src/routes/teamDispatches.ts:37,72" },
    { "id": "QO-005", "severity": "P3", "category": "untested", "title": "FR-dependency-frontend-tests open — 2 portal test files missing", "files": ["portal/Frontend/tests/DependencySection.test.tsx", "portal/Frontend/tests/BlockedBadge.test.tsx"] },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 has no Verifies comment", "file": "platform/orchestrator/" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "teamDispatches/TeamsPage/RepoSelector have no spec FR", "files": ["portal/Backend/src/routes/teamDispatches.ts", "portal/Frontend/src/pages/TeamsPage.tsx", "portal/Frontend/src/components/common/RepoSelector.tsx"] },
    { "id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable for react-hooks/exhaustive-deps in 3 files", "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63", "portal/Frontend/src/hooks/useApi.ts:35"] },
    { "id": "QO-009", "severity": "P4", "category": "missing-traceability", "title": "playwright.pipeline.config.ts lacks Verifies comment", "file": "Source/E2E/playwright.pipeline.config.ts" }
  ],
  "re_verification": "first_run — no prior P1/P2 findings to re-verify",
  "architecture_rules_violations": ["QO-004: direct DB in teamDispatches.ts"],
  "console_log_in_production": false,
  "hardcoded_secrets": false,
  "skipped_tests": false
}
```
