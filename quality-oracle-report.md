---

## Quality Oracle Findings

### Spec Coverage: Source/-scoped ~97% | Cross-plan ~60%

The workflow engine's own spec (`Plans/self-judging-workflow`) is **100% traced**. The 60% cross-plan figure is structural — 50 FRs from 7 other plans target `portal/` which the inspector config doesn't scan, not genuine missing implementations.

---

### QO-001 — `/api/search` Route Not Wired ⚠️ **P1**
- **Category:** untested / spec-drift
- **File:** `Source/Backend/src/app.ts` (missing) / `Source/Backend/tests/routes/search.test.ts:1-7`
- **Detail:** The `GET /api/search` endpoint (FR-dependency-search) powers the DependencyPicker typeahead. A test file exists and causes the traceability enforcer to report PASS, but the test file's own header explicitly states: *"the GET /api/search endpoint is NOT wired into app.ts. These tests will FAIL until the route is implemented."* The feature is broken at runtime. Users cannot add dependencies.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` and register it in `app.ts`. The test file fully specifies the contract.

---

### QO-002 — `inspector.config.yml` Excludes `portal/` ⚠️ **P2**
- **Category:** architecture-violation
- **File:** `Teams/TheInspector/inspector.config.yml:41-44`
- **Detail:** `source.dirs: ["Source/"]` only. The `portal/` directory has 30+ source files implementing FR-033–FR-089. The default enforcer run always picks `self-judging-workflow` (100% PASS), masking all portal gaps.
- **Recommendation:** Add `portal/Backend/src/` and `portal/Frontend/src/` to `source.dirs`.

---

### QO-003 — Dependency Add Returns Wrong Shape ⚠️ **P2**
- **Category:** spec-drift
- **File:** `Source/Backend/src/routes/workflow.ts:324`
- **Detail:** `api-contracts.md` specifies `{data: WorkItem}` (201). Implementation returns a raw `DependencyLink` object.
- **Recommendation:** Respond with the updated WorkItem wrapped in `{data: item}`.

---

### QO-004 — `pending_dependencies` Status Absent from Enum ⚠️ **P2**
- **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts:214`
- **Detail:** `api-contracts.md` specifies that approving a blocked item sets status to `pending_dependencies`. The `WorkItemStatus` enum has no such value; the dispatch route returns HTTP 400 instead. The cascade auto-advance from `pending_dependencies → approved` is also unimplemented.
- **Recommendation:** Add `PendingDependencies = 'pending_dependencies'` to the enum, update transitions, change dispatch logic to set status rather than error.

---

### QO-005 — 7 Plan Files with Unimplemented FRs ⚠️ **P2**
Most actionable: `Plans/duplicate-deprecated-status` (status: APPROVED) has FR-DUP-06 through FR-DUP-13 unimplemented in `portal/`.

---

### QO-006 — `eslint-disable` Suppressions Without Explanation ⚡ P3
`useWorkItems.ts:63` and `DependencyPicker.tsx:82` suppress React hooks warnings silently.

### QO-007 — `/health` Endpoint Untraced ⚡ P3
`app.ts:41` — no `// Verifies: FR-XXX` comment.

### QO-008 — 3 Portal Files Lack Traceability ⚡ P3
`portal/Backend/src/routes/teamDispatches.ts`, `portal/Frontend/src/components/common/RepoSelector.tsx`, `portal/Frontend/src/pages/TeamsPage.tsx` — all recently added, none traced to a spec FR.

### QO-009 — Duplicate Test Files ⚡ P4
Two test suites each for `WorkItemDetailPage` and `WorkItemListPage` (flat `tests/` and `tests/pages/`).

### QO-010 — `playwright.pipeline.config.ts` Untraced ⚡ P4

---

**Full report saved to:** `Teams/TheInspector/findings/audit-2026-05-03-B.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
