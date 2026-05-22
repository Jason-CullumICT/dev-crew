---

## Quality Oracle Findings

**Grade: C** | **Spec Coverage: ~88%** | **2026-05-22**

---

### Spec Coverage: ~88%

| Spec File | Requirements | Traced | Status |
|-----------|-------------|--------|--------|
| `workflow-engine.md` (via Plans/) | 13 | 13 (100%) | ✅ |
| `dev-workflow-platform.md` | ~86 | ~82 (~95%) | ⚠️ |
| `tiered-merge-pipeline.md` | 10 | 9 (90%) | ⚠️ |
| **Total** | **~109** | **~96** | |

> The traceability enforcer reports **PASSED** but covers only **13 of 109 requirements** — a 12% sample.

---

### QO-001 — Traceability Enforcer Scope Gap
- **Severity:** P1 | **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:48-57`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` inside `Plans/`. It never reads `Specifications/dev-workflow-platform.md` (86 reqs), `Specifications/tiered-merge-pipeline.md` (10 reqs), and never scans `portal/` or `platform/`. Green gate = misleading signal.
- **Recommendation:** Extend to accept a `--specs-dir Specifications/` flag and add `portal/` + `platform/` to scan dirs.

---

### QO-002 — Ghost Requirements: FR-070..095 and FR-DUP-* in Portal Code
- **Severity:** P1 | **Category:** spec-drift
- **File:** `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`, `portal/Frontend/src/components/orchestrator/types.ts` (and others)
- **Detail:** 50+ `// Verifies:` comments in portal code point to FR-070 through FR-095 and FR-DUP-01 through FR-DUP-13 — **none of these IDs appear in any file under `Specifications/`**. Code claims to verify requirements that don't exist. Violates the core rule: *implementation traces to specs, never the other way around.*
- **Recommendation:** Write the missing specs in `Specifications/dev-workflow-platform.md`, or remap comments to existing IDs.

---

### QO-003 — FR-dependency-metrics: `dependencyCheckDuration` Histogram Missing
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** Spec `FR-dependency-metrics` requires 4 metrics; only 3 exist. The `dependencyCheckDuration` Histogram is completely absent from `metrics.ts`.
- **Recommendation:** Add `new Histogram({ name: 'dependency_check_duration_seconds', ... })` and instrument it in `dependency.ts` around `hasUnresolvedBlockers`/`isReady`. Add test case.

---

### QO-004 — FR-dependency-seed: Seed Data Completely Unimplemented
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Source/Backend/` (missing)
- **Detail:** No seed script exists for the required dependency relationships (BUG-0010 blocked_by BUG-0003/4/5/6/7; FR-0004 blocked_by FR-0003, etc.).
- **Recommendation:** Create `Source/Backend/src/store/seed.ts` with idempotent startup seeding.

---

### QO-005 — `pending_dependencies` Not in WorkItemStatus Enum
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts:5-15`
- **Detail:** `api-contracts.md` documents `pending_dependencies` as a required dispatch-gating status, but the enum doesn't contain it. The comment on line 213 says "Support for pending_dependencies blocking" — that support doesn't exist at the type level.
- **Recommendation:** Add `PendingDependencies = 'pending_dependencies'` to enum; add transitions; coordinate backend + frontend.

---

### QO-006 — Portal Uses Non-Canonical FR-dependency-* Naming *(P3)*
Portal code uses `FR-dependency-linking`, `FR-dependency-cycle-detection`, `FR-dependency-ready-check` — spec defines `FR-dependency-service`, `FR-dependency-endpoints`, `FR-dependency-search`. Naming drift breaks any traceability matcher.

### QO-007 — Duplicate Test Files *(P3)*
`WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` exist at **two paths** in `Source/Frontend/tests/` (root and `pages/` subdirectory). Both carry overlapping `FR-WF-011` annotations.

### QO-008 — E2E Test Command Is Unrunnable *(P3)*
`Source/E2E/package.json` `test` script: `echo "Error: no test specified" && exit 1`. Playwright config exists but the standard verification gate (`npm test --workspaces`) can't run E2E tests.

### QO-009 — Undocumented `eslint-disable` in Production *(P3)*
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` suppress `react-hooks/exhaustive-deps` with no justification comment.

### QO-010 — FR-TMP-008 Missing Verifies in Dockerfile.worker *(P4)*
### QO-011 — `FR-0001` Zero-Pad Typo in Portal *(P4)*

---

**Full report:** `Teams/TheInspector/findings/audit-2026-05-22-C.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`

The two P1 findings are the most urgent: the enforcer's green gate is a false confidence signal covering only 12% of total spec scope, and ~50 portal Verifies comments point to requirements that were never written — a systematic inversion of the spec-first mandate.
