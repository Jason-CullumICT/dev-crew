Now the full audit report:

---

## Quality Oracle Findings

### Spec Coverage: ~85%

| Scope | Reqs | Traced | % |
|-------|------|--------|---|
| `Source/` — FR-WF-001–013 (self-judging workflow) | 13 | 13 | **100%** |
| `Source/` — FR-dependency-* (dependency feature) | 16 | 15 | **94%** |
| `portal/` — FR-001–089+ (dev-workflow platform) | 89+ | ~80 | **~90%** |
| `Specifications/tiered-merge-pipeline.md` — FR-TMP-001–010 | 10 | 0 | **0%** |

**Traceability enforcer run (2026-04-24):**
```
Targeting: Plans/self-judging-workflow/requirements.md
Scanning 13 requirements…
★ TRACEABILITY PASSED — All 13 requirements have implementation references.
```
*(Enforcer only checked FR-WF-001–013; see QO-005 for scope limitation.)*

---

### QO-001: FR-dependency-search route not implemented in Source/
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/routes/` (file missing); `Source/Backend/tests/routes/search.test.ts:6`
- **Detail:** The test file itself acknowledges the gap at line 6: *"GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No `search.ts` route file exists. `app.ts` has no `/api/search` registration. FR-dependency-search requires cross-entity typeahead search over work items, which the dependency picker needs.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` and register `app.use('/api/search', searchRouter)` in `app.ts`. The test contract in `search.test.ts` already defines the exact expected behavior.
- **Cross-ref:** TheFixer — backend route implementation

---

### QO-002: FR-dependency-api-types — `blocked_by` missing from portal API input types
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts:32,59`; `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- **Detail:** `UpdateFeatureRequestInput` (line 32) and `UpdateBugInput` (line 59) in `portal/Shared/api.ts` do not include `blocked_by?: string[]`. As a direct consequence, `DependencyPicker.tsx` uses `as any` casts at lines 291 and 293 to silence the type error. This violates the architecture rule "Shared types are single source of truth — no inline type re-definitions." It also means PATCH calls with dependency arrays are not type-checked.
- **Recommendation:** Add `blocked_by?: string[]` to both `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`. Then remove the `as any` casts in `DependencyPicker.tsx` lines 291–293.
- **Cross-ref:** TheFixer — api-contract + frontend fix; ESCALATE if `as any` is used elsewhere for security-relevant fields

---

### QO-003: FR-dependency-seed — portal dependency seed data never loaded
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (seed.ts missing)
- **Detail:** Requirements state: "BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003 — seeded after base items exist." No `seed.ts` file exists anywhere in `portal/Backend/src/database/`. The known seed dependency relationships are never persisted to SQLite on startup, making the demo data incomplete and dependency dispatch-gating untestable manually.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent seeding logic. Wire into `portal/Backend/src/index.ts` after schema init.
- **Cross-ref:** TheFixer — portal backend

---

### QO-004: FR-dependency-frontend-tests — portal BlockedBadge and DependencySection tests absent
- **Severity:** P2
- **Category:** untested
- **File:** `portal/Frontend/tests/` (DependencySection.test.tsx and BlockedBadge.test.tsx missing)
- **Detail:** `portal/Frontend/tests/` has `DependencyPicker.test.tsx` but not `DependencySection.test.tsx` or `BlockedBadge.test.tsx`. These components exist at `portal/Frontend/src/components/shared/` and have non-trivial logic (chip rendering, edit button gating by status, badge color state). Note: the *Source/* equivalents (`Source/Frontend/tests/components/DependencySection.test.tsx` etc.) exist and are well-covered — but portal/ has its own copies of these components and they are untested.
- **Recommendation:** Create `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` with `// Verifies: FR-dependency-section` and `// Verifies: FR-dependency-blocked-badge` traceability comments respectively.
- **Cross-ref:** TheFixer — portal frontend tests

---

### QO-005: Traceability enforcer blind to portal/ requirements
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:48-57` (most-recently-modified fallback)
- **Detail:** The enforcer's default mode picks the single most-recently-modified `requirements.md` in `Plans/`. On this run, it picked `Plans/self-judging-workflow/requirements.md` and validated only FR-WF-001–013. Portal's ~89+ requirements (FR-001 to FR-089+) spanning multiple plan files are **never validated** by the enforcer in default mode. This creates false confidence — CLAUDE.md states "Verification gates: `python3 tools/traceability-enforcer.py`" but a passing run does not mean portal requirements are traced.
- **Recommendation:** Add a second enforcer invocation to the verification gate: `python3 tools/traceability-enforcer.py --plan dev-workflow-platform`. Update `CLAUDE.md` to list both commands in the verification gate section. Alternatively, update the enforcer to scan all `requirements.md` files in parallel.
- **Cross-ref:** Solo session — tools/ and CLAUDE.md update

---

### QO-006: 29 phantom `FR-0001` Verifies in portal shared dependency components
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `portal/Frontend/src/components/shared/BlockedBadge.tsx:1,9`; `portal/Frontend/src/components/shared/DependencySection.tsx:1,21,71,110,143`; `portal/Frontend/src/components/shared/DependencyPicker.tsx:1,21` (+ more)
- **Detail:** All three portal dependency components use `// Verifies: FR-0001` — an ID that does not exist in any specification, plan, or requirements document in this repository. The correct IDs per `Plans/dependency-linking/requirements.md` are `FR-dependency-blocked-badge`, `FR-dependency-section`, and `FR-dependency-picker`. The phantom ID will never be resolved by the traceability enforcer and falsely implies coverage.
- **Recommendation:** Replace all `FR-0001` references in these three files with the correct IDs: `FR-dependency-blocked-badge` (BlockedBadge.tsx), `FR-dependency-section` (DependencySection.tsx), `FR-dependency-picker` (DependencyPicker.tsx).
- **Cross-ref:** TheFixer — portal frontend (low-risk, cosmetic fix)

---

### QO-007: FR-090–FR-095 referenced in portal but undefined in any spec/plan
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Frontend/src/components/orchestrator/RunDetailRow.tsx:1,13,41,48,103,132,146,180`; `portal/Frontend/src/components/orchestrator/types.ts:26,37`
- **Detail:** `RunDetailRow.tsx` references `FR-092` and `types.ts` references `FR-090` throughout. No plan or specification defines FR-090 through FR-095. The highest documented requirements in any plan are FR-089 (image-upload plan). These are likely from an undocumented orchestrator-runs feature that was implemented without a corresponding requirements document or plan.
- **Recommendation:** Either (a) create a minimal requirements document in `Plans/orchestrator-runs/requirements.md` defining FR-090–FR-095 retroactively, or (b) map these to the closest existing FR IDs in the orchestrator-cycle-dashboard plan (FR-070–FR-076). This is a traceability debt, not a code defect.
- **Cross-ref:** TheFixer — portal frontend traceability cleanup

---

### QO-008: `teamDispatches.ts` — recently modified route with zero Verifies comments
- **Severity:** P2
- **Category:** untested / pattern-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:1-30+`
- **Detail:** This route handler for team dispatch history (`GET /api/team-dispatches`) has no `// Verifies:` traceability comments and was modified within the last 14 days. It implements inline type definitions (`TeamDispatch` interface at line 14) rather than importing from `portal/Shared/types.ts`, violating the "Shared types are single source of truth" rule. It also imports directly from `../database/connection` without a service layer, violating "No direct DB calls from route handlers."
- **Recommendation:** (1) Add Verifies comments linking to the correct FR, (2) extract `TeamDispatch` type to `portal/Shared/types.ts`, (3) introduce a `teamDispatchService.ts` for the DB query, (4) add a test in `portal/Backend/tests/teamDispatches.test.ts`.
- **Cross-ref:** TheFixer — portal backend architecture; ESCALATE if team dispatch data is security-sensitive

---

### QO-009: FR ID collision — two plans claim FR-070–FR-076
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Plans/orchestrator-cycle-dashboard/requirements.md:19` (FR-070 = OrchestratorCyclesPage); `Plans/image-upload/requirements.md:6` (FR-070 = ImageAttachment type)
- **Detail:** Both plans independently assigned FR-070 through FR-076+ without coordination. Portal Verifies comments that say `// Verifies: FR-074` are ambiguous — they could refer to `CycleLogStream` or the image service's `uploadImages`. The traceability enforcer would count both as covered for the same ID, masking gaps.
- **Recommendation:** Renumber one of the conflicting plans. Suggest: image-upload starts at FR-077 or uses a namespaced scheme (FR-IMG-001). Update portal/ Verifies comments after renumbering.

---

### QO-010: FR-TMP-001–010 (Tiered Merge Pipeline spec) — zero implementation coverage
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (all 10 FRs); no Verifies in Source/ or portal/
- **Detail:** The tiered-merge-pipeline spec defines 10 requirements: risk classification, Playwright E2E generation, live E2E runner, auto-PR creation, AI PR review, risk-tiered auto-merge, config env vars, worker prerequisites, run JSON extensions, and error handling. There are zero `// Verifies: FR-TMP-XXX` comments anywhere in `Source/` or `portal/`. This spec may be implemented in `platform/` (orchestrator infrastructure, which is explicitly outside pipeline agent scope) or may be a future/aspirational spec.
- **Recommendation:** Verify whether FR-TMP-* is implemented in `platform/` scripts. If so, add Verifies comments there. If it's a future spec, annotate `Specifications/tiered-merge-pipeline.md` with a `Status: planned` header to distinguish it from active specs.

---

### QO-011: Duplicate test files — WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** doc-stale / pattern-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Two parallel test files exist for each of these pages. Both cover the same component, both carry `// Verifies: FR-WF-010/011` traceability, and both will run in CI (Vitest collects all `*.test.tsx` files). This inflates apparent test coverage and makes it unclear which is the authoritative file. Test counts and line counts suggest partial overlap but also divergence in coverage scenarios.
- **Recommendation:** Compare both pairs for unique scenarios, merge into the more complete version, and delete the redundant file. Canonical location should be `Source/Frontend/tests/pages/` to match the component structure.

---

### QO-012: `eslint-disable` for `react-hooks/exhaustive-deps` in two production files
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`; `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` lint errors. Missing dependencies in effect/callback dependency arrays can cause stale closure bugs where the hook silently uses outdated state. This is a common source of hard-to-reproduce race conditions in React.
- **Recommendation:** Review both suppressions. If the suppressed dep is intentionally excluded (e.g., a stable ref), document why with a comment. If the dep was omitted to avoid infinite loops, the hook logic likely needs restructuring (e.g., `useCallback` wrapping or functional update pattern).

---

### QO-013: `DebugPortalPage.tsx` — non-standard Verifies ID
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** Uses `// Verifies: dev-crew debug portal` — a free-text string, not a `FR-XXX` format ID. The traceability enforcer and any pattern-based tooling will not recognize this as a valid traceability marker. This page is a utility (embedded iframe for the portal debug UI) and may not need a requirement — but if it does, it should use a real FR-ID.
- **Recommendation:** Either remove the comment entirely (if this page is infra with no spec requirement), or map it to an existing FR (e.g., `FR-WF-009` for the App scaffolding) with a note.

---

### Overall Grade: **B**

| Criterion | Required (B) | Actual |
|-----------|-------------|--------|
| P1 findings | 0 | **0** ✅ |
| P2 findings | ≤8 | **8** ✅ (borderline) |
| Spec coverage (active plans) | ≥60% | **~85%** ✅ |

The codebase has excellent traceability discipline on the Source/ workflow engine (100% FR-WF coverage, zero console.log violations, zero empty catch blocks, structured logging throughout). The B grade reflects accumulated open work items on the portal/dependency feature (QO-002, QO-003, QO-004) and systemic traceability infrastructure gaps (QO-005, QO-006, QO-007).

---

```json
{
  "audit_date": "2026-04-24",
  "grade": "B",
  "spec_coverage_pct": 85,
  "total_requirements_active_plans": 29,
  "requirements_traced": 25,
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-search route not implemented in Source/"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "blocked_by missing from portal UpdateBugInput/UpdateFeatureRequestInput; as any in DependencyPicker"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "portal dependency seed.ts does not exist"},
    {"id": "QO-004", "severity": "P2", "category": "untested", "title": "portal DependencySection and BlockedBadge tests absent"},
    {"id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Traceability enforcer only checks FR-WF-001-013, ignores portal FR-001-089+"},
    {"id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "29 phantom FR-0001 Verifies in portal shared dependency components"},
    {"id": "QO-007", "severity": "P2", "category": "spec-drift", "title": "FR-090 to FR-095 in portal have no defining requirements document"},
    {"id": "QO-008", "severity": "P2", "category": "pattern-violation", "title": "teamDispatches.ts: recently modified, 0 Verifies, direct DB call in route handler"},
    {"id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "FR-070-076 collision between orchestrator-cycle-dashboard and image-upload plans"},
    {"id": "QO-010", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-001-010 (tiered merge pipeline) has zero implementation coverage"},
    {"id": "QO-011", "severity": "P3", "category": "pattern-violation", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage in Source/Frontend"},
    {"id": "QO-012", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable react-hooks/exhaustive-deps in 2 production files"},
    {"id": "QO-013", "severity": "P4", "category": "pattern-violation", "title": "DebugPortalPage uses free-text Verifies comment, not a valid FR-ID"}
  ],
  "p1_count": 0,
  "p2_count": 8,
  "p3_count": 4,
  "p4_count": 1,
  "escalations": [
    {"finding": "QO-008", "to": "TheGuardians", "reason": "teamDispatches.ts direct DB call in route handler warrants security review if team dispatch data is sensitive"},
    {"finding": "QO-002", "to": "TheGuardians", "reason": "as any cast on security-adjacent dependency PATCH body — confirm no injection risk"}
  ],
  "fix_routing": [
    {"findings": ["QO-001","QO-002","QO-003","QO-004","QO-006","QO-008"], "team": "TheFixer"},
    {"findings": ["QO-005","QO-009","QO-010"], "team": "solo-session (tools/CLAUDE.md/specs)"}
  ]
}
```
