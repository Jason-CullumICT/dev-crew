# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-05-21

### Architecture: Three Applications, One Repo

This is a **multi-app monorepo** with three distinct applications. Always audit all three:

| Dir | Application | Spec | Test Runner |
|-----|-------------|------|-------------|
| `Source/` | Self-Judging Workflow Engine | `Specifications/workflow-engine.md` (FR-WF-001–013) | Jest (via `Source/Backend/jest.config.js`) + Vitest (Frontend) |
| `portal/` | Dev Workflow Platform | `Specifications/dev-workflow-platform.md` (FR-001–069+) | Check `portal/Backend/` and `portal/Frontend/` for their own test setups |
| `platform/` | Orchestrator Infrastructure | `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | `platform/orchestrator/lib/workflow-engine.test.js` |

### Traceability Enforcer Limitation

`tools/traceability-enforcer.py` **only scans `Source/` and `E2E/`**. The portal and platform directories are invisible to it. When it reports "TRACEABILITY PASSED" it only means the 13 WF requirements from the most-recently-modified plan file are covered.

To get meaningful results, run with explicit `--file`:
```bash
python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md
python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md
```
(Note: the dev-workflow-platform enforcer will show 34 MISSING because portal/ isn't scanned — this is a known enforcer gap, not actual missing implementations.)

### Key File Paths

| Purpose | Path |
|---------|------|
| Backend test config | `Source/Backend/jest.config.js` |
| Backend package | `Source/Backend/package.json` (uses Jest, not Vitest) |
| Frontend package | `Source/Frontend/package.json` (uses Vitest) |
| Portal backend routes | `portal/Backend/src/routes/` |
| Portal backend services | `portal/Backend/src/services/` |
| Platform workflow engine | `platform/orchestrator/lib/workflow-engine.js` |
| Shared types (Source app) | `Source/Shared/types/workflow.ts` |
| Portal shared types | `portal/Shared/` |

### Open Issues as of This Run

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| QO-001 | P1 | OPEN | node_modules not installed in Source/Backend and Source/Frontend |
| QO-002 | P1 | OPEN | Traceability enforcer doesn't scan portal/ or platform/ |
| QO-003 | P2 | OPEN | GET /api/search not wired in Source/Backend/src/app.ts |
| QO-004 | P2 | OPEN | dependencyCheckDuration histogram missing from Source/Backend/src/metrics.ts |
| QO-005 | P2 | OPEN | No OpenTelemetry instrumentation in Source/Backend |
| QO-006 | P3 | OPEN | Two logger abstractions in Source/Backend/src/ |
| QO-007 | P3 | OPEN | eslint-disable-next-line in DependencyPicker.tsx and useWorkItems.ts |
| QO-008 | P4 | OPEN | FR-TMP-008 unannotated in platform/Dockerfile.worker |
| QO-009 | P4 | OPEN | Silent catch on JSON parse in Source/Frontend/src/api/client.ts |

### Spec Coverage Trend

- First audit: Source/ WF spec 100%, FR-dependency 86% (search gap, histogram gap), Portal 100%+, Platform 90%+ (FR-TMP-008 unannotated)
- Enforcer effective coverage: ~11% of all specs (structural limitation, not missing implementations)

### Pattern: Search Test as Gap Marker

`Source/Backend/tests/routes/search.test.ts` is explicitly annotated as a "this will fail until implemented" marker. This pattern — writing tests before the route — is healthy but needs to be tracked. When QO-001 is resolved, these tests will surface the gap immediately.

### Console.log Status

- Source/Backend/: ✅ Clean — no console.log in production code
- Portal/Backend/: ✅ Clean — no console.log found
- Architecture rule fully respected in both apps
