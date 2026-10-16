# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-10-16 — First Full Audit

#### Key File Paths
- Specs: `Specifications/dev-workflow-platform.md` (FR-001–FR-069), `Specifications/workflow-engine.md` (no explicit FR numbers), `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–FR-TMP-010)
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001–FR-WF-013)
- Traceability enforcer: `tools/traceability-enforcer.py` — uses most-recently-modified `requirements.md` in `Plans/`, NOT `Specifications/`
- Source: `Source/Backend/src/` (TypeScript Express), `Source/Frontend/src/` (React/Vite), `Source/Shared/types/workflow.ts`
- Tests: `Source/Backend/tests/`, `Source/Frontend/tests/`

#### Critical Structural Issue
The project has TWO parallel, disconnected specification systems:
1. `Specifications/` — formal domain truth (workflow-engine.md, dev-workflow-platform.md, tiered-merge-pipeline.md)
2. `Plans/*/requirements.md` — plan-level requirements used by the traceability enforcer

The enforcer only checks `Plans/`, leaving `Specifications/` entirely unchecked. The source code traces to FR-WF-001–FR-WF-013 (Plans-level) while `Specifications/dev-workflow-platform.md` defines FR-001–FR-069 for a DIFFERENT product domain (Feature Request platform vs. Workflow Engine).

#### Spec Coverage Baseline
- FR-WF-001 through FR-WF-013: **100% covered** (plans-level enforcer passes)
- FR-dependency-*: **100% covered** (14 unique IDs, both backend and frontend)
- FR-001 through FR-069 (dev-workflow-platform): **0% covered** — product not built
- FR-TMP-001 through FR-TMP-010 (tiered-merge-pipeline): **0% covered** — not built

#### Architecture Violation Pattern
Route handlers (`workItems.ts`, `workflow.ts`, `intake.ts`) call `store.*` directly. Specifically: store.findById, store.createWorkItem, store.findAll, store.updateWorkItem, store.softDelete called from route layer. This violates "No direct DB calls from route handlers — use the service layer."

#### Pattern Violations Found
- 2 `eslint-disable` comments: `DependencyPicker.tsx:82`, `useWorkItems.ts:63` (both: react-hooks/exhaustive-deps)
- Dashboard routes have no Prometheus metrics (only debug-level logging)
- `setup.ts` test file missing Verifies comment (minor)

#### Spec Trend
**Declining** — two out of three Specifications documents have 0% implementation coverage. The project built something real (workflow engine) but `Specifications/dev-workflow-platform.md` describes a completely different platform. The specs directory needs pruning/archiving or the active platform needs to be clarified.

#### Useful Notes for Future Audits
- Run `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` to get full missing list
- Run `python3 tools/traceability-enforcer.py` (no args) to check active plan requirements (always passes for FR-WF-*)
- No hardcoded secrets found
- No console.log in production source (logger abstraction used correctly)
- No skipped tests found
- No truly empty catch blocks (all log + re-throw or return error response)
- `workflow-engine.md` has NO explicit FR-* IDs — it's a narrative domain spec
