Now let me write the main findings report:

---

## Quality Oracle Findings

### Spec Coverage: ~97%
- **79 canonical requirements** in `Specifications/` (FR-001–069 + FR-TMP-001–010)
- **79/79 traced** to code (portal/ and platform/ respectively)
- Additional 50+ plan-level FRs (FR-070–089, FR-DUP-*, FR-dependency-*) are **100% or near-100% traced** within portal/
- **Traceability enforcer** reports 100% — but only checks `Source/` against one plan; portal/ and platform/ have **no automated coverage gate**

---

### QO-001: Traceability Enforcer Has a Blind Spot for 2 of 3 Codebases
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer scans `Source/` only and targets the most-recently-modified `Plans/*/requirements.md` (currently `Plans/self-judging-workflow/requirements.md`). It never checks `portal/` against `Specifications/dev-workflow-platform.md` or `platform/` against `Specifications/tiered-merge-pipeline.md`. A coder could add untraced portal routes and the gate would still pass. CLAUDE.md mandates running the enforcer as a verification gate before completion.
- **Recommendation:** Extend enforcer to accept multiple target paths and spec files, or add a `portal/` pass: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md --source portal/`
- **Cross-ref:** TheFixer (enhancement)

---

### QO-002: FR Namespace Collision — FR-070 to FR-076 Used by Two Different Plans
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **Files:** `Plans/image-upload/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md`
- **Detail:** Both plans independently assign FR-070 through FR-076 to entirely different features. `Plans/image-upload/requirements.md:FR-073` = "Configure multer middleware". `Plans/orchestrator-cycle-dashboard/requirements.md:FR-073` = "Create CycleLogStream SSE component". Portal source code references `// Verifies: FR-073` in `portal/Backend/src/middleware/upload.ts` (multer), but the Sidebar uses `// Verifies: FR-076` for an orchestrator nav-label change. Traceability comments are now **ambiguous** — they could resolve to either plan.
- **Recommendation:** Assign orchestrator-cycle-dashboard FRs a non-colliding range (e.g., FR-100+). Update Verifies comments in portal Frontend orchestrator components accordingly.
- **Cross-ref:** TheFixer

---

### QO-003: Ghost FR IDs — FR-090 to FR-095 Have No Spec Definition
- **Severity:** P2
- **Category:** spec-drift / untested
- **Files:** `portal/Frontend/src/components/orchestrator/types.ts`, `portal/Frontend/src/components/orchestrator/RunsTab.tsx`, `portal/Frontend/src/components/orchestrator/RunDetailRow.tsx`, `portal/Frontend/src/api/client.ts:457,465`
- **Detail:** 43 `// Verifies: FR-090` through `// Verifies: FR-095` comments exist in portal orchestrator components, but **no plan or spec file defines these IDs** — confirmed by grep across all of `Plans/` and `Specifications/`. Developers assigned spec IDs during implementation without writing the specs. These are unspecified features that violate the "spec-first" mandate of CLAUDE.md.
- **Recommendation:** Write a specification entry (either in `Specifications/dev-workflow-platform.md` or a new `Plans/orchestrator-runs-view/requirements.md`) for FR-090–095, covering orchestrator run types, RunsTab, RunDetailRow, and API client run functions.
- **Cross-ref:** TheATeam (requirements-reviewer)

---

### QO-004: Three Recently-Added Files With Zero Traceability Comments
- **Severity:** P2
- **Category:** untested / spec-drift
- **Files:**
  - `portal/Backend/src/routes/teamDispatches.ts` (0 Verifies, added ≤14 days)
  - `portal/Frontend/src/pages/TeamsPage.tsx` (0 Verifies, added ≤14 days)
  - `portal/Frontend/src/components/common/RepoSelector.tsx` (0 Verifies, added ≤14 days)
- **Detail:** All three were modified within the last 14 days and carry zero `// Verifies: FR-XXX` traceability comments. `teamDispatches.ts` appears to implement a new "team dispatch history" API, and `TeamsPage.tsx`/`RepoSelector.tsx` implement the corresponding UI — yet there is no spec or plan document describing this feature. CLAUDE.md architecture rule: "Every FR needs a test with `// Verifies: FR-XXX` traceability comments".
- **Recommendation:** Either (a) write a requirements document for the teams/dispatch-history feature and add Verifies comments, or (b) if this is speculative code, remove it and go spec-first.
- **Cross-ref:** TheFixer

---

### QO-005: Duplicate Frontend Test Files With Diverging Content
- **Severity:** P2
- **Category:** test-quality
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (older, 23 Verifies, no typed imports from Shared/)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (newer, 21 Verifies, imports from `Shared/types/workflow`)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (older, 18 Verifies)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (newer, 13 Verifies)
- **Detail:** Each component has two test files that are NOT identical — they have different mock setups, different assertions, and different import paths. Both versions run in the test suite (vitest picks up both), potentially causing redundant passes that mask regression coverage. The `tests/pages/` versions import typed fixtures from `Shared/types/workflow`; the root versions use untyped objects. The root versions mock additional APIs (`workItemsApi.list`, `dashboardApi`) that the pages/ versions don't.
- **Recommendation:** Keep only the `tests/pages/` version (newer, typed). Delete the root `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` after confirming coverage parity.
- **Cross-ref:** TheFixer

---

### QO-006: Three Open Implementation Gaps From Existing Plans
- **Severity:** P2
- **Category:** spec-drift (implementation behind spec)
- **Detail:** The following plan requirements are documented as APPROVED but remain unimplemented:

  | Requirement | File | What's Missing |
  |-------------|------|----------------|
  | FR-dependency-api-types | `portal/Shared/api.ts:32–38` | `blocked_by?: string[]` absent from `UpdateFeatureRequestInput` and `UpdateBugInput`; forces `as any` cast at `portal/Frontend/src/components/shared/DependencyPicker.tsx:291` |
  | FR-dependency-seed | `portal/Backend/src/database/` | No `seed.ts` file; idempotent dependency seed data (BUG-0010 blocked_by 5 bugs, FR-0004/0005/0007 blocked_by others) never runs on startup |
  | FR-DUP-06 | `portal/Backend/src/routes/` | "Detail endpoints always return full item regardless of status" — zero `// Verifies: FR-DUP-06` comments; unverified that this behaviour is actually enforced |

- **Recommendation:** Route to TheFixer. The dependency-linking plan dispatch-plan.md already contains the exact implementation instructions.

---

### QO-007: `FR-0001` Used as Fake Spec ID
- **Severity:** P3
- **Category:** spec-drift / pattern-violation
- **Files:**
  - `portal/Frontend/src/api/client.ts:227` — `// Verifies: FR-0001 — General search across bugs and feature requests`
  - `portal/Frontend/src/components/shared/DependencyPicker.tsx:288` — `// Verifies: FR-0001 — Save dependencies via PATCH with blocked_by array`
- **Detail:** `FR-0001` (4-digit format) is a **database entity ID** (the first seeded feature request row). It is not a valid requirement ID. The correct IDs are `FR-dependency-search` and `FR-dependency-api-types` respectively. This creates false traceability — the enforcer regex `FR-\d+` would match both `FR-001` and `FR-0001`, giving spurious coverage signals.
- **Recommendation:** Replace `FR-0001` with `FR-dependency-search` in `client.ts:227` and `FR-dependency-api-types` in `DependencyPicker.tsx:288`.
- **Cross-ref:** TheFixer

---

### QO-008: FR-TMP-008 Implemented But Not Traced
- **Severity:** P3
- **Category:** untested
- **File:** `platform/` Dockerfile.worker (confirmed by QA reports and tiered-merge-pipeline plan)
- **Detail:** `Specifications/tiered-merge-pipeline.md:FR-TMP-008` ("Worker Container Prerequisites: `gh` CLI in Dockerfile.worker, Playwright installable") is confirmed implemented (per QA reports), but the Dockerfile has no `// Verifies: FR-TMP-008` comment. Tests for FR-TMP-002 (QA E2E test generation) and FR-TMP-008 lack dedicated test cases — noted in `Plans/tiered-merge-pipeline/traceability-report.md`. The `spec-drift-report.json` at the project root incorrectly shows 0% TMP coverage because it scanned `Source/` instead of `platform/`.
- **Recommendation:** Add `# Verifies: FR-TMP-008` to the relevant Dockerfile.worker section. Update/delete the stale root-level `spec-drift-report.json`.

---

### QO-009: 26 Plan FRs Exist Only in Plans/ — Not Promoted to Specifications/
- **Severity:** P3
- **Category:** spec-drift
- **Detail:** CLAUDE.md: "Specifications/ — Domain truth. The most critical documents." The following implemented, approved features were never added to `Specifications/dev-workflow-platform.md`:

  | Plan | FR Range | Feature |
  |------|----------|---------|
  | `Plans/image-upload/` | FR-070–089 | Image attachment uploads |
  | `Plans/orchestrator-cycle-dashboard/` | FR-070–076 (collision!) | Orchestrator cycle view |
  | `Plans/duplicate-deprecated-status/` | FR-DUP-01–13 | Duplicate/deprecated statuses |
  | `Plans/dependency-linking/` | FR-dependency-* | Dependency tracking |

  The canonical spec document is incomplete and drifting behind the Plans layer.
- **Recommendation:** Either (a) append implemented plan FRs to `Specifications/dev-workflow-platform.md` as new subsections after completion, or (b) update CLAUDE.md to explicitly acknowledge that Plans/ FRs are authoritative once approved and Specifications/ is a snapshot.

---

### QO-010: `eslint-disable` in Two Production Files
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both suppressions silence `react-hooks/exhaustive-deps`, which guards against stale closure bugs. No comment explains why the suppression is safe here. Per CLAUDE.md: no silent error suppression without documentation.
- **Recommendation:** Either add a comment explaining the intentional omission (e.g., `// intentionally omitting X to avoid re-triggering on every render — see PR #NN`), or fix the hooks to include the dependencies correctly.

---

### QO-011: Hardcoded Localhost URL in E2E Config
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/E2E/playwright.pipeline.config.ts:7`
- **Detail:** `baseURL: "http://localhost:5105"` is hardcoded with no `process.env` fallback. The sibling `playwright.config.ts:9` also hardcodes `http://localhost:5173`. Both should use environment variables so CI can override the port.
- **Recommendation:** `baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173'`

---

```json
{
  "grade": "B",
  "spec_coverage_canonical": "97%",
  "spec_coverage_plans": "95%",
  "findings": {
    "P1": 0,
    "P2": 6,
    "P3": 5,
    "P4": 0
  },
  "grading_rationale": "0 P1s, 6 P2s (max 8 for B), canonical spec coverage ~97% (exceeds 60% min for B, but 6 P2s exceed 3-max for A)",
  "open_plan_gaps": [
    "FR-dependency-api-types (blocked_by missing from portal/Shared/api.ts)",
    "FR-dependency-seed (no seed.ts in portal/Backend/src/database/)",
    "FR-DUP-06 (no Verifies comment for detail endpoint full-return)"
  ],
  "ghost_fr_ids": ["FR-090", "FR-091", "FR-092", "FR-093", "FR-094", "FR-095"],
  "fr_namespace_collisions": ["FR-070-076 (image-upload vs orchestrator-cycle-dashboard)"],
  "enforcer_blind_spots": ["portal/ (FR-001..095)", "platform/ (FR-TMP-001..010)"],
  "unlinked_recent_files": [
    "portal/Backend/src/routes/teamDispatches.ts",
    "portal/Frontend/src/pages/TeamsPage.tsx",
    "portal/Frontend/src/components/common/RepoSelector.tsx"
  ]
}
```

---

**Grade: B** — Canonical spec coverage is strong (~97%) and no P1 severity issues. Six P2 findings prevent an A: the traceability enforcer has a structural blind spot for `portal/` and `platform/`, ghost FR IDs (FR-090–095) indicate features shipped without specs, three recently-added files carry zero traceability, and three known plan items remain open. The FR namespace collision (FR-070–076) is a latent integrity risk that will compound as more plans are written.

**Priority action list:**
1. **[TheFixer]** Implement FR-dependency-api-types (add `blocked_by` to UpdateBugInput/UpdateFeatureRequestInput) and FR-dependency-seed
2. **[TheFixer]** Delete root `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` (duplicate tests)
3. **[TheATeam → requirements-reviewer]** Write spec for FR-090–095 (orchestrator run view) and TeamsPage/teamDispatches feature
4. **[solo-session]** Extend traceability enforcer to also scan `portal/` against `Specifications/dev-workflow-platform.md`
5. **[solo-session]** Resolve FR-070–076 namespace collision by renumbering orchestrator-cycle-dashboard FRs
