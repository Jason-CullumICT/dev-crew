# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-05-22 — Full Audit (Grade: C)

**Spec coverage trend:** First audit — baseline established at ~88% across 3 spec files (~109 requirements).

---

## Key File Paths for Fast Future Audits

| Path | What's there |
|------|-------------|
| `tools/traceability-enforcer.py` | Only scans `Plans/self-judging-workflow/requirements.md` (13 reqs). **Does NOT scan Specifications/ directly.** |
| `Source/Shared/types/workflow.ts` | WorkItemStatus enum — `pending_dependencies` is documented in comments but NOT in the enum |
| `Source/Backend/src/metrics.ts` | Has 3 of 4 required FR-dependency-metrics counters. `dependencyCheckDuration` histogram missing |
| `portal/Shared/types.ts` | Dependency types for dev-workflow-platform spec — uses `FR-dependency-linking` naming (different from spec's `FR-dependency-service`) |
| `portal/Frontend/src/` | References FR-070..095 and FR-DUP-01..13 — these IDs do NOT appear in any Specifications/ file |
| `platform/orchestrator/lib/workflow-engine.js` | FR-TMP-* tiered merge pipeline implementation |
| `Source/E2E/package.json` | `"test": "echo Error: no test specified"` — E2E tests are unrunnable via npm test |
| `Source/Frontend/tests/` | Duplicate test files: WorkItemDetailPage.test.tsx AND pages/WorkItemDetailPage.test.tsx |

## Common Pattern Violations Found

1. **Ghost requirements** — Portal code has Verifies comments pointing to FR IDs that don't exist in any spec. Happens when teams implement features without writing specs first.

2. **Enforcer blind spots** — `traceability-enforcer.py` uses most-recently-modified `requirements.md` in Plans/ — it NEVER reads from `Specifications/` directly. Any spec in `Specifications/` that doesn't have a corresponding `Plans/*/requirements.md` is invisible to the enforcer.

3. **Alternative FR naming** — `portal/` uses `FR-dependency-linking`, `FR-dependency-cycle-detection`, `FR-dependency-ready-check`. Specs define `FR-dependency-service`, `FR-dependency-endpoints`, `FR-dependency-search`. Naming drift breaks traceability.

4. **platform/ excluded from enforcer** — The enforcer only scans `Source/` and `E2E/`. FR-TMP-* requirements are implemented in `platform/` (legit for infrastructure) but invisible to the gate.

## Architecture Notes

- `portal/` implements `Specifications/dev-workflow-platform.md` (Express/SQLite/React app)
- `Source/` implements `Specifications/workflow-engine.md` (in-memory store, workflow engine)
- `platform/` implements `Specifications/tiered-merge-pipeline.md` (orchestrator infrastructure)
- All three are separate applications that co-exist in the monorepo
- `FR-dependency-*` requirements in dev-workflow-platform.md map to BOTH portal/ AND Source/ implementations (parallel implementations for different apps)
