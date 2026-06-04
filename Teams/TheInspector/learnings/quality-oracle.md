# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-06-04

### Spec Coverage Trend
- **Active plan (FR-WF-*):** 100% — self-judging-workflow plan is fully traced
- **Dependency-linking (FR-dependency-*):** ~81% effective (per impl delta; enforcer can't detect these — lowercase IDs)
- **dev-workflow-platform.md:** 0% — orphaned spec, never checked by enforcer

### Architecture Snapshot
The project has TWO conceptual apps:
1. **Old Portal App** (`portal/` dir, NOT `Source/`) — implemented the dev-workflow-platform spec (FR-001–FR-069). Not currently active in pipelines.
2. **New Source App** (`Source/`) — implements the Self-Judging Workflow Engine (FR-WF-001–FR-WF-013). This is the live codebase.

`Specifications/dev-workflow-platform.md` describes the portal app, not the Source app. This distinction is critical — do not run the traceability enforcer against dev-workflow-platform.md for the Source/ codebase.

### Key File Locations
- Active backend app entry: `Source/Backend/src/app.ts`
- In-memory store: `Source/Backend/src/store/workItemStore.ts`
- Logger (real): `Source/Backend/src/utils/logger.ts` (named export)
- Logger (adapter): `Source/Backend/src/logger.ts` (default export, wraps utils)
- Metrics: `Source/Backend/src/metrics.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Traceability enforcer: `tools/traceability-enforcer.py` (targets most-recently-modified Plans/*/requirements.md)

### Enforcer Gotchas
- **Regex `FR-[A-Z0-9-]+`** does NOT match lowercase FR IDs like `FR-dependency-types`. All dependency-linking FRs are invisible to the enforcer.
- **Data IDs** like `FR-0004` (work item doc IDs) appear in requirements.md prose and get false-matched as requirement IDs. This produces spurious enforcer failures when targeting `Plans/dependency-linking/requirements.md`.
- **Single-target by design** — enforcer only checks one file at a time (the most recently modified). For multi-plan projects, pass `--plan <name>` or `--file <path>` explicitly.

### Known Open Gaps (as of 2026-06-04)
| Finding | Description | Recommended To |
|---------|-------------|----------------|
| QO-001 | `Specifications/dev-workflow-platform.md` is orphaned — no implementation in Source/ | Archive/deprecate the spec |
| QO-002 | `GET /api/search` not in app.ts — search.test.ts always fails | TheFixer |
| QO-003 | Route handlers (workItems.ts, workflow.ts) call store directly, bypass service layer | TheFixer |
| QO-004 | Enforcer: lowercase miss, data-ID false-positives, single-plan scope | tools/ improvement |
| QO-005 | Logger has no dev pretty-print mode | TheFixer |
| QO-006 | No OpenTelemetry — missing tracing/traceparent | TheFixer + TheGuardians |
| QO-007 | FR-dependency-seed not implemented in Source/ | TheFixer (or mark N/A) |
| QO-010 | Source/E2E/package.json test script is broken placeholder | TheFixer |

### Common Patterns Found
- **Store-as-DB violation**: Route handlers commonly import `* as store` directly. Watch for this pattern in new backend routes.
- **Logger fragmentation**: When different agents work on the same module, they may create incompatible import patterns. Establish canonical import form in CLAUDE.md.
- **eslint-disable-next-line react-hooks/exhaustive-deps**: Two instances in frontend. Future audits should check if this count grows.
- **"Intentionally failing" tests**: `search.test.ts` explicitly documents a broken state. Flag any test file with comments like "will FAIL until implemented" — these violate the zero-new-failures gate.

### Tracing the Correct Spec
When running the enforcer, always pass the correct plan explicitly:
```bash
python3 tools/traceability-enforcer.py --plan self-judging-workflow
python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md
```
Do NOT run without flags if dependency-linking is the newest plan (it will false-fail on data IDs).
