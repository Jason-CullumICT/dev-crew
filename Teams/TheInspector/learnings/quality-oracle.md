# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-09-14

### Spec Coverage Trend

| Scope | FR IDs | Traced in Source | Coverage |
|-------|--------|-----------------|----------|
| Plans/self-judging-workflow (enforcer target) | 13 | 13 | **100%** |
| Plans/dependency-linking | 16 | ~12 (partial, some in portal/) | **~75%** |
| Specifications/dev-workflow-platform.md | 74 | 0 | **0%** |
| **Total (all formal specs)** | **~103** | **~25** | **~24%** |

Enforcer reports PASS because it only sees Plans/self-judging-workflow. True coverage from Specifications/ = 0%.

### Key Findings (Persistent)

#### P1 — Spec drift: 74+ FR IDs in Specifications/ have zero implementation traces

`Specifications/dev-workflow-platform.md` defines a large system (Feature Requests, Bug Reports, Dev Cycles, etc.) with FR-001 through FR-069+ that is completely disconnected from Source/ code. The traceability enforcer NEVER checks Specifications/ — it only checks the most recently modified Plans/*/requirements.md. This is the root structural gap.

#### P2 — Architecture violation: direct store calls in route handlers

`Source/Backend/src/routes/workItems.ts`, `workflow.ts`, and `intake.ts` call `store.*` directly from route handlers. The architecture rule says "No direct DB calls from route handlers — use the service layer." Services exist (assessment, changeHistory, dependency, router, dashboard) but basic CRUD bypasses them.

#### P2 — FR-dependency-search unimplemented in Source/Backend

`GET /api/search` is not registered in `Source/Backend/src/app.ts`. The test file `Source/Backend/tests/routes/search.test.ts` explicitly documents this: "will FAIL until the route is implemented." This is a **known failing test suite**.

#### P2 — Traceability enforcer does not cover Specifications/

The enforcer uses Plans/ autodiscovery only. The config's `specs.dir: "Specifications/"` setting is never consumed by the enforcer. To fix: extend `tools/traceability-enforcer.py` to also scan all .md files in Specifications/ for FR IDs and cross-reference them against Source/.

### Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Specifications/dev-workflow-platform.md` | 74 FR IDs (FR-001 to FR-069+, FR-dependency-*) — none implemented in Source/ |
| `Specifications/workflow-engine.md` | Narrative spec for the self-judging workflow engine (no FR IDs here) |
| `Plans/self-judging-workflow/requirements.md` | 13 FR-WF-* IDs, all enforced, all traced |
| `Plans/dependency-linking/requirements.md` | 16 FR-dependency-* IDs; status tracker is partially stale (was written for portal/ paths) |
| `Source/Backend/src/routes/workItems.ts` | Main CRUD route — direct store calls (architecture violation) |
| `Source/Backend/src/routes/workflow.ts` | Workflow transitions — direct store calls (architecture violation) |
| `Source/Backend/src/routes/intake.ts` | Intake webhooks — direct store calls (architecture violation) |
| `Source/Backend/tests/routes/search.test.ts` | Self-documented as failing — search route not implemented |
| `tools/traceability-enforcer.py` | Only scans Plans/; needs extension to cover Specifications/ |

### Common Pattern Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` used in two files without justification comment
- `.catch(() => ({}))` in api/client.ts swallows JSON parse errors silently

### Two-Codebase Confusion

This repo has TWO different backend applications:
- `Source/Backend/` — self-judging workflow engine (in active development)
- `portal/` — debug UI + portal backend (older, separate app)

`Plans/dependency-linking/requirements.md` targets `portal/` paths, but the actual dependency implementation lives in `Source/`. The status tracker in that plan is stale relative to `Source/`.
