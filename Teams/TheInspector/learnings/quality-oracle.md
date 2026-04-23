# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-23 — Grade C

### Spec Coverage Trend

| Spec | Coverage |
|------|----------|
| `Specifications/workflow-engine.md` (FR-WF-*) | 100% |
| `Specifications/dev-workflow-platform.md` (FR-001..FR-069 + FR-dependency-*) | ~96% |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 90% |
| **Reverse drift** (FR-070..FR-095, FR-DUP-01..FR-DUP-13 in code, no spec entry) | 40 unspecced |

---

### Key File Paths (for faster future audits)

| Purpose | Path |
|---------|------|
| Canonical spec (portal app) | `Specifications/dev-workflow-platform.md` |
| Canonical spec (Source/ app) | `Specifications/workflow-engine.md` — FR IDs defined in `Plans/self-judging-workflow/requirements.md` |
| Canonical spec (platform) | `Specifications/tiered-merge-pipeline.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` — auto-selects most recent requirements.md |
| Active enforcer target | `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013 only!) |
| Portal backend routes | `portal/Backend/src/routes/` |
| Portal backend services | `portal/Backend/src/services/` |
| Shared types (Source/) | `Source/Shared/types/workflow.ts` |
| Shared types (portal/) | `portal/Shared/types.ts`, `portal/Shared/api.ts` |
| Platform pipeline | `platform/orchestrator/lib/workflow-engine.js`, `dispatch.js` |

---

### Common Pattern Violations Found

1. **Spec back-porting gap**: Plans implement features using new FR IDs (e.g., FR-070+, FR-DUP-*) but these never get merged into `Specifications/`. Result: `Specifications/dev-workflow-platform.md` stops at FR-069 while the system has ~110+ implemented requirements.

2. **Traceability enforcer blind spot**: The enforcer picks the most-recently-modified `requirements.md`. When `Plans/self-judging-workflow/requirements.md` is most recent, it only checks 13 of ~100+ active requirements. Always run `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` as a secondary check.

3. **Direct SQL in routes**: `portal/Backend/src/routes/teamDispatches.ts` contains raw `db.prepare()` SQL in the route handler — the only portal route to bypass the service layer entirely. All other routes correctly call service functions (even when they call `getDb()`, they pass it to `bugService`, `cycleService`, etc.).

4. **eslint-disable** in hooks: `react-hooks/exhaustive-deps` suppressions in `DependencyPicker.tsx`, `useWorkItems.ts`, `useApi.ts`. These are not dangerous but should have justification comments.

---

### Known Open Issues (carry-forward from dependency-linking plan delta)

| Issue | Status | File |
|-------|--------|------|
| FR-dependency-api-types: `blocked_by` missing from `UpdateBugInput` / `UpdateFeatureRequestInput` | **STILL OPEN** | `portal/Shared/api.ts` |
| FR-dependency-seed: `seed.ts` missing | **STILL OPEN** | `portal/Backend/src/database/` |
| FR-dependency-frontend-tests: `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing | **STILL OPEN** | `portal/Frontend/tests/` |

---

### Architecture Notes

- **`Source/` app** implements the self-judging workflow engine (work items, routing, assessment pod, dashboard). Pure in-memory store, no SQLite.
- **`portal/` app** implements the dev-crew platform (feature requests, bugs, dev cycles, pipeline runs, learnings, features). Uses SQLite via better-sqlite3.
- **`platform/`** is the orchestrator infrastructure (Docker, node scripts). Never touched by pipeline agents. Implements tiered merge pipeline (FR-TMP-*).
- The two apps have separate `Shared/` type directories — do not confuse `Source/Shared/` with `portal/Shared/`.
- Portal routes pass `db` to service functions as a parameter pattern — `getDb()` in a route is NOT a violation if it's immediately passed to a service call like `listBugs(db)`.
