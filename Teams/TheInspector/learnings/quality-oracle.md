# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-23 — Full Audit

### Codebase Architecture (Critical Context)

This project has **three separate codebases** — not one:

| Dir | Implements | Spec source |
|-----|------------|-------------|
| `Source/` | Self-Judging Workflow Engine (in-memory, work items) | `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013, FR-dependency-*) |
| `portal/` | Dev-Workflow Platform (SQLite, feature requests, bugs, cycles) | `Specifications/dev-workflow-platform.md` (FR-001 to FR-069, FR-dependency-*) |
| `platform/` | Orchestrator infrastructure | `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010) |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, making spec drift in `portal/` and `platform/` invisible to automated enforcement.

### Useful File Paths

- Active enforcer target: `Plans/self-judging-workflow/requirements.md` (13 FRs, all passing)
- Portal traceability: `portal/Backend/src/`, `portal/Frontend/src/`
- Platform traceability: `platform/orchestrator/lib/workflow-engine.js`, `platform/orchestrator/lib/dispatch.js`
- Known failing tests (intentional): `Source/Backend/tests/routes/search.test.ts` — documents unimplemented `GET /api/search`

### Open Findings from This Run

| ID | Severity | Status |
|----|----------|--------|
| FR-dependency-search not wired in Source/ | P1 | OPEN — documented in test comment as known gap |
| FR-dependency-metrics missing histogram in Source/ | P1 | OPEN — `dependencyCheckDuration` absent from `Source/Backend/src/metrics.ts` |
| FR-dependency-seed unimplemented | P2 | OPEN — no seed data in portal/ or Source/ |
| Traceability enforcer blind to portal/ and platform/ | P2 | OPEN — systemic gap |
| eslint-disable in production hook | P2 | OPEN — `Source/Frontend/src/hooks/useWorkItems.ts:63` |
| Silent JSON parse swallow in api/client.ts | P3 | OPEN — `Source/Frontend/src/api/client.ts:26` |

### Spec Coverage Trend

- First audit. No prior baseline.
- `Plans/self-judging-workflow/requirements.md`: 100% covered by enforcer
- `Specifications/dev-workflow-platform.md`: not enforced (portal/ not scanned)
- `Specifications/tiered-merge-pipeline.md`: not enforced (platform/ not scanned)

### Common Pattern Violations

- Production code has one `eslint-disable-next-line` (react-hooks/exhaustive-deps) — CLAUDE.md prohibits disabled linting rules
- One silent catch in frontend API client degrades error message quality
- FR-dependency-seed is specified but never implemented in any codebase
