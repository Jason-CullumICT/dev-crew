---

## Quality Oracle Findings

### Grade: **C**

Traceability enforcer passed (`13/13 FR-WF-*`), but that covers only **12% of the project's total spec surface**. Here's the full picture:

---

### Spec Coverage: Split Picture

| Spec Source | FRs | Enforcer Tracks? | Coverage |
|-------------|-----|-----------------|----------|
| `Plans/self-judging-workflow/` (FR-WF-*) | 13 | ✅ Yes | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | ~70 | ❌ No | **~87%** (3 FRs missing) |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | ❌ No | **~90%** (Verifies: stripped) |
| `Plans/dependency-linking/` (FR-dependency-*) | 16 | ❌ No | **~81%** (3 missing) |
| **Total** | **~109** | **13 tracked** | **Enforcer blind to 88% of spec surface** |

---

### QO-001 — P1 | `GET /api/search` Not Mounted
**`Source/Backend/src/app.ts`** — `FR-dependency-search` requires a cross-entity search endpoint. `Source/Backend/tests/routes/search.test.ts` has 5 tests for it and **explicitly states they will fail** ("This is intentional — the failing tests surface the implementation gap"). The route handler never gets mounted in `app.ts`. Five tests actively fail on `npm test`. → **TheFixer, backend-coder**

---

### QO-002 — P2 | Traceability Enforcer Blind to 88% of Spec Surface
**`tools/traceability-enforcer.py`** — Only scans `Plans/*/requirements.md` → `Source/` + `E2E/`. The `portal/` codebase (1073 `Verifies:` comments) and `platform/` (FR-TMP-* implementation) are never validated. When all `requirements.md` files share the same mtime, file selection is non-deterministic. → **Solo session / tooling**

---

### QO-003 — P2 | FR-TMP `Verifies:` Comments Stripped During `docker/` → `platform/` Rename
**`platform/orchestrator/lib/workflow-engine.js`** (2047 lines) — The tiered merge pipeline traceability report confirms 10/10 FR-TMP-* were implemented with `// Verifies:` comments in `docker/orchestrator/`. After the rename, `platform/orchestrator/lib/workflow-engine.js` has **0 Verifies: comments**. Implementation is present (riskLevel, `_runPlaywrightE2E`, `_createPR`, `_aiReviewPR`, `_autoMerge`) but unlinked to spec. → **Solo session only (platform/ off-limits to pipeline agents)**

---

### QO-004 — P2 | `blocked_by` Missing from portal Update Types
**`portal/Shared/api.ts:32–67`** — `UpdateFeatureRequestInput` and `UpdateBugInput` both lack `blocked_by?: string[]`. The frontend `DependencyPicker` works around this with `as any` casts. → **TheFixer, api-contract**

---

### QO-005 — P2 | `portal/Backend/src/database/seed.ts` Missing
`FR-dependency-seed` requires idempotent dependency seeding (8 known relationships). No seed file exists. Without it, the dependency UI shows empty on known items. → **TheFixer, portal backend-coder**

---

### QO-006 — P2 | Two Portal Frontend Test Files Missing
`portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` never created. The portal's `BlockedBadge` (which correctly implements red + amber states) has zero test coverage. → **TheFixer, portal frontend-coder**

---

### QO-007 — P3 | Source/Frontend `BlockedBadge` Missing Amber `pending_dependencies` State
**`Source/Frontend/src/components/BlockedBadge.tsx`** — Spec requires amber badge for `status='pending_dependencies'`. Component only accepts `hasUnresolvedBlockers?: boolean`, no `status` prop. The portal's BlockedBadge is complete; Source's diverges. `WorkItemStatus` also lacks `pending_dependencies`.

---

### QO-008 — P3 | `eslint-disable` Suppressions in Production (×2)
- `Source/Frontend/src/components/DependencyPicker.tsx:82`  
- `Source/Frontend/src/hooks/useWorkItems.ts:63`  
Both suppress `react-hooks/exhaustive-deps` with no explanation of why the suppression is safe.

---

### QO-009 — P3 | Silent `.catch(() => ({}))` in API Client
**`Source/Frontend/src/api/client.ts:26`** — JSON parse errors silently discarded. Architecture rule: "every catch block must either re-throw, log with full context, or explicitly document why suppressed." No documentation present.

---

### QO-010 — P3 | `playwright.pipeline.config.ts` Hardcoded to Past-Run `testDir`
**`Source/E2E/playwright.pipeline.config.ts`** — `testDir: "./tests/cycle-run-1774659927912-8dd3ac77"`. Should be dynamic per `FR-TMP-002` (`cycle-{run-id}/`). Fix: use `process.env.CYCLE_RUN_ID`.

---

### QO-011 — P3 | `workflow.ts` at 374 Lines (>300 Guideline)
Mix of workflow actions + dependency management. Extract `dependencies.ts` route file.

---

### QO-012 — P4 | Route Handlers Bypass Service Layer for CRUD
`workItems.ts` and `workflow.ts` call `workItemStore.*` directly. Business logic (pagination math, filter conditions) lives in route handlers instead of a service layer.

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-05-06-C.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
