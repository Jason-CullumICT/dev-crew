# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-12 — Full Audit

### Spec Coverage Trend
- **First audit** — establishing baseline.
- Canonical `Specifications/dev-workflow-platform.md` numeric FRs (FR-001–FR-069): **69/69** in portal — 100%.
- Canonical dependency FRs (16 fine-grained IDs): **1/16** exact match — portal uses different ID vocabulary.
- `Specifications/tiered-merge-pipeline.md` FRs (FR-TMP-001–010): **0/10** — not implemented in Source/ or portal/.
- Overall canonical spec traceability: **~73%** (69/95 trackable requirements).

### Key Structural Findings

| # | Finding | Status |
|---|---------|--------|
| 1 | Traceability enforcer never scans `portal/` | OPEN — P1 |
| 2 | FR-090–FR-095 have no backing spec or plan | OPEN — P1 |
| 3 | Direct DB calls in `portal/Backend/src/routes/teamDispatches.ts` | OPEN — P2 |
| 4 | Silent `.catch(() => {})` in RepoSelector, FeatureRequestDetail, BugDetail | OPEN — P2 |
| 5 | FR-TMP-* spec with zero implementation traceability | OPEN — P2 |
| 6 | Traceability enforcer auto-detect is non-deterministic (all mtimes equal) | OPEN — P3 |
| 7 | `Specifications/workflow-engine.md` has no FR IDs (2-hop chain) | OPEN — P3 |
| 8 | Three files exceed 500-line threshold | OPEN — P3 |
| 9 | FR-0001 vs FR-001 zero-padding inconsistency | OPEN — P3 |
| 10 | 3 eslint-disable react-hooks/exhaustive-deps suppressions in hooks | OPEN — P3 |

### Useful Paths for Future Audits

| Purpose | Path |
|---------|------|
| Canonical specs | `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`, `Specifications/workflow-engine.md` |
| Traceability tool | `tools/traceability-enforcer.py` |
| Portal backend routes | `portal/Backend/src/routes/` |
| Portal backend services | `portal/Backend/src/services/` |
| Portal backend tests | `portal/Backend/tests/` |
| Portal frontend tests | `portal/Frontend/tests/` |
| Orchestrator UI components | `portal/Frontend/src/components/orchestrator/` |
| Source backend | `Source/Backend/src/` |

### Common Pattern Violations Found
- **Silent catches**: `.catch(() => {})` pattern in portal Frontend, specifically in components that call `repos.list()` (RepoSelector, FeatureRequestDetail, BugDetail).
- **Scope creep without spec**: Orchestrator UI features (FR-090–095) added without a canonical plan/spec entry.
- **ID vocabulary drift**: Implementation uses coarse-grained FR IDs (e.g., `FR-dependency-linking`) while spec defines fine-grained IDs. Both end up matching the enforcer regex but they're semantically disconnected.
- **Enforcer scope gap**: `source_dirs = ["Source", "E2E"]` hardcoded — portal is silently excluded.

### Notes for Future Runs
- Run enforcer with `--plan` arg to avoid non-deterministic auto-selection: e.g., `python3 tools/traceability-enforcer.py --plan dev-workflow-platform`.
- `portal/` must be added to the enforcer's scan scope for meaningful CI coverage.
- `FR-090–095` are in `portal/Frontend/src/components/orchestrator/` — check if a plan was created for these since this audit.
- `Specifications/tiered-merge-pipeline.md` FR-TMP-* likely implemented in `platform/` (outside scan scope) — confirm by checking platform/ files when solo-session access is available.
