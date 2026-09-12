# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-12 — Grade C

### Spec Coverage Trend
- Active plan (FR-WF-001…013): **100%** — all 13 requirements covered
- Overall (all specs combined): **27%** — 80 requirements across two other specs are unimplemented or describe a different system

### Key Architecture Insight: Two Parallel Specs
This project has **two domain specifications** that describe fundamentally different systems:

1. **`Specifications/workflow-engine.md`** → actual source code (WorkItem entity, assessment pod, routing)
2. **`Specifications/dev-workflow-platform.md`** → different system (FeatureRequest, BugReport, DevelopmentCycle)

The source implements #1. The primary/canonical spec (#2) has zero implementation. This is the most important structural finding — it means any naive spec-drift audit will show 0% coverage unless you check which spec the source actually targets.

### Traceability Enforcer Behavior
- `tools/traceability-enforcer.py` with no args picks the **most recently modified `requirements.md`** under `Plans/`
- Currently auto-selects `Plans/self-judging-workflow/requirements.md` (FR-WF-*)
- Does NOT cover: FR-dependency-* requirements (dep-linking plan) or FR-TMP-* (tiered-merge-pipeline spec)
- Always run the enforcer explicitly with `--plan <name>` to target specific plans

### Useful File Paths for Future Audits
| Path | What to check |
|------|---------------|
| `Plans/self-judging-workflow/requirements.md` | Active FR-WF-* requirements |
| `Specifications/workflow-engine.md` | The spec the source implements (no FR IDs in spec itself — IDs are in Plans/) |
| `Specifications/dev-workflow-platform.md` | Platform spec (different system; FR-001…069 + FR-dependency-*) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001…010 — unimplemented as of 2026-09-12 |
| `Source/Backend/tests/routes/search.test.ts` | Explicitly notes /api/search is not wired — P1 gap |
| `Source/Backend/src/app.ts` | Route mounting — check for missing routers |
| `Source/Frontend/src/api/client.ts:26` | Silent catch pattern — architecture rule violation |

### Common Patterns Found
- FR-WF-013 (observability) frequently skipped in test Verifies comments — backend devs implement logging but don't test it
- `react-hooks/exhaustive-deps` suppressions in hooks and picker components — flag for review
- Search route implementation gap: test file precedes route implementation (contract-first testing pattern), but route was never wired

### Prior Findings Status
| Finding | Status |
|---------|--------|
| QO-001: GET /api/search not wired | **OPEN** — confirmed 2026-09-12 |
| QO-002: dev-workflow-platform.md spec drift | **OPEN** — structural issue |
| QO-003: FR-TMP-* unimplemented | **OPEN** |
| QO-004: Enforcer blind spot | **OPEN** |
| QO-005: FR-WF-013 no test | **OPEN** |
| QO-006: Silent catch in api/client.ts:26 | **OPEN** |
| QO-007: eslint-disable suppressions | **OPEN** |
