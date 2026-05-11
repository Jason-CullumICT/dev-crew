---

## Quality Oracle Findings

**Grade: A** | Spec Coverage: ~96% (116 / 121 requirements)
**P1:** 0 | **P2:** 1 | **P3:** 5 | **P4:** 2

---

### Spec Coverage by Area

| Spec | Reqs | Covered | % |
|------|------|---------|---|
| `dev-workflow-platform.md` FR-001–069 | 69 | 69 | 100% |
| `dev-workflow-platform.md` FR-dependency-* | 16 | 13 | 81% |
| `workflow-engine.md` FR-WF-001–013 | 13 | 13 | 100% |
| `tiered-merge-pipeline.md` FR-TMP-001–010 | 10 | 9 | 90% |
| `Plans/duplicate-deprecated-status` FR-DUP-01–13 | 13 | 12 | 92% |

**Traceability enforcer** (`python3 tools/traceability-enforcer.py`): ✅ PASSES — but only against the most recently modified plan (`self-judging-workflow`). Multi-plan gaps are invisible to it.

---

### QO-001 — P2 · Architecture Violation · Direct DB Calls from Route Handlers

**Files:** 9 route files in `portal/Backend/src/routes/` (`bugs.ts`, `featureRequests.ts`, `cycles.ts`, `pipelines.ts`, `dashboard.ts`, `teamDispatches.ts`, `learnings.ts`, `search.ts`, `features.ts`)

51 direct `getDb()` calls are scattered across route handlers, bypassing the `portal/Backend/src/services/` layer entirely for many operations. This violates CLAUDE.md's hard rule: *"No direct DB calls from route handlers — use the service layer."* The `Source/` implementation has zero violations; this is specific to `portal/`.

**Fix:** Move all SQL from route files into service functions. Routes call services; services own `getDb()`. Refactor in priority order: cycles → pipelines → teamDispatches (most logic-heavy).

---

### QO-002 — P3 · Spec Drift · FR-dependency-api-types Missing

`portal/Shared/api.ts`: `UpdateBugInput` and `UpdateFeatureRequestInput` have no `blocked_by?: string[]` field. The `DependencyPicker` uses `as any` casts to work around this. Confirmed open per the plan's Implementation Delta table.

---

### QO-003 — P3 · Spec Drift · FR-dependency-seed Missing

No `portal/Backend/src/database/seed.ts` exists. The known dependency seed relationships (BUG-0010 blocked by 5 bugs; FR-0004/0005/0007 blocked by others) are never inserted on startup.

---

### QO-004 — P3 · Untested · FR-dependency-frontend-tests: Two test files absent

`portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist. Only `DependencyPicker.test.tsx` is present. Both components (DependencySection, BlockedBadge) have zero test coverage.

---

### QO-005 — P3 · Spec Drift · FR-TMP-008 Unlinked in platform/Dockerfile.worker

`FR-TMP-008` (gh CLI + Playwright in worker container) is implemented in `platform/Dockerfile.worker` but has no `# Verifies: FR-TMP-008` comment. The traceability enforcer never scans `platform/`, so this gap is permanently invisible to automated gates. All other FR-TMP-* IDs (001–007, 009–010) are correctly traced.

---

### QO-006 — P3 · Spec Drift · FR-DUP-06 Has No Verifies Comment

`FR-DUP-06` (detail endpoints always return item regardless of status) is implemented but the GET detail handlers in `portal/Backend/src/routes/bugs.ts` and `featureRequests.ts` carry no `// Verifies: FR-DUP-06` comment.

---

### QO-007 — P4 · Pattern Violation · eslint-disable in Production Code

`Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63` both suppress `react-hooks/exhaustive-deps`. These likely mask missing hook dependencies rather than intentional omissions.

---

### QO-008 — P4 · Pattern Violation · Duplicate Logger in Source/Backend

`Source/Backend/src/logger.ts` is a compatibility re-export wrapper around `src/utils/logger.ts` (the real implementation). Two coders imported from different paths; the wrapper resolves it but adds confusion about the canonical import.

---

**No escalations to TheGuardians** — no auth bypass, injection risk, or hardcoded secrets found.

**Report saved:** `Teams/TheInspector/findings/audit-2026-05-11-A.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
