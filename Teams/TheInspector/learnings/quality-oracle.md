# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Spec Coverage Trend

**Audit run: 2026-06-08**

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | 13 | 100% ✅ |
| `dev-workflow-platform.md` (FR-001–069) | 69 | verified in portal/ | Enforcer cannot measure |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 9 in platform/ | 90% |
| `FR-dependency-*` (16 requirements) | 16 | 15 | 94% — seed missing |

---

## Critical Discoveries

### Two-application repo structure
- **`Source/`** implements `Specifications/workflow-engine.md` (Self-Judging Workflow Engine), using FR-WF-* IDs from `Plans/self-judging-workflow/requirements.md`. In-memory store, no SQLite.
- **`portal/`** implements `Specifications/dev-workflow-platform.md` (Dev Workflow Platform), using FR-001–069 + FR-dependency-* IDs. SQLite with better-sqlite3. Implemented in Express + React.
- **`platform/`** implements `Specifications/tiered-merge-pipeline.md` (Tiered Merge Pipeline), using FR-TMP-* IDs. Orchestrator (Node.js, Docker).

### Traceability enforcer blind spot (P1)
The tool `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`. It cannot verify portal/ or platform/. Running it against `Plans/dev-workflow-platform/requirements.md` falsely reports 34 missing (all implemented in portal/). Running it against `Plans/dependency-linking/requirements.md` falsely reports 7 missing.

### FR-dependency-seed: Not implemented (P2)
No `portal/Backend/src/database/seed.ts` exists. No seed call in `portal/Backend/src/index.ts`. Dependency seed data (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007, etc.) is missing from portal/ startup.

### FR-TMP-008: No Verifies comment (P2)
Implementation exists in `platform/Dockerfile.worker` (gh CLI + playwright install). No `Verifies: FR-TMP-008` comment anywhere.

### FR-dependency-* ID collision (P2)
Source/ uses FR-dependency-* Verifies IDs for its in-memory WorkItem dependency service. portal/ uses the same FR-dependency-* IDs for its SQLite BugReport/FeatureRequest dependency service. Ambiguous cross-reference.

---

## Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Source/Backend/src/store/workItemStore.ts` | In-memory store (workflow-engine) |
| `Source/Shared/types/workflow.ts` | Shared types for workflow-engine |
| `Source/Backend/src/services/dependency.ts` | In-memory dependency service |
| `portal/Backend/src/database/schema.ts` | SQLite schema for dev-workflow-platform |
| `portal/Backend/src/services/dependencyService.ts` | SQLite dependency service |
| `platform/orchestrator/lib/workflow-engine.js` | Tiered merge pipeline orchestrator |
| `platform/orchestrator/lib/config.js` | FR-TMP-007 env var config |
| `platform/Dockerfile.worker` | FR-TMP-008 prerequisites |
| `Plans/self-judging-workflow/requirements.md` | Active requirements for Source/ (enforcer default) |
| `tools/traceability-enforcer.py` | Scans Source/ + E2E/ only — blind to portal/ and platform/ |

---

## Common Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` in Source/Frontend hooks/components (2 occurrences)
- Missing `Verifies:` on infra/config files (vite.config.ts, playwright.pipeline.config.ts) — acceptable P4

---

## Architecture Rules Passing (as of 2026-06-08)

- ✅ No `console.log` in production source (logger abstraction used throughout)
- ✅ No hardcoded secrets
- ✅ No swallowed catch blocks (all log + respond)
- ✅ Service layer between routes and store/DB
- ✅ No `test.skip` / `test.todo` patterns
- ✅ No files > 500 lines
- ✅ Shared types used from Shared/ (no inline re-definitions found in Source/)
- ✅ All list endpoints return `{data: T[]}` wrappers
