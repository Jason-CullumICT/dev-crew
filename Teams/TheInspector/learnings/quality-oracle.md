# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-07-31 — Full Audit

**Spec coverage trend:** First audit. Plans/-based coverage = 100% (self-judging-workflow). Specifications/-based coverage = 0% (0/76 FRs in dev-workflow-platform.md, 0/13 in tiered-merge-pipeline.md).

**Key structural insight — Two-tier spec system:**
This project has a two-tier spec system that causes confusion:
- `Specifications/` = domain truth documents (FR-001 to FR-069, FR-TMP-*, workflow-engine.md). These are high-level platform specs.
- `Plans/{feature}/requirements.md` = implementation-level specs with FR-WF-* or FR-dependency-* IDs. The traceability enforcer targets these.
- Source code traces to Plans/ FRs (FR-WF-*, FR-dependency-*), NOT to Specifications/ FRs (FR-001 to FR-069).
- `Specifications/workflow-engine.md` is the domain spec for the currently built system but contains no FR-XXX IDs — making it enforcer-invisible.

**Common pattern violations found:**
- Route latency Prometheus histogram consistently absent across the project
- OpenTelemetry (OTel) not implemented anywhere in Source/ despite being required by CLAUDE.md and multiple FRs
- `dependencyCheckDuration` histogram skipped (only counters implemented for dependency metrics)
- BlockedBadge component missing amber/pending_dependencies state variant
- `pending_dependencies` status value missing from WorkItemStatus enum

**Useful paths for faster future audits:**
- Traceability enforcer: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` → reveals 76 untraced FRs
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013)
- Dependency requirements: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Plans delta file tracks what's done/missing: `Plans/dependency-linking/requirements.md` "Implementation Delta" section (may be stale)
- Metrics: `Source/Backend/src/metrics.ts` — check for histogram presence
- Logger: two modules — `src/logger.ts` (compat default) + `src/utils/logger.ts` (actual named). `workItemStore.ts` imports directly from utils, others use the compat wrapper.
- Search route: exists in tests (`tests/routes/search.test.ts`) but NOT in `src/app.ts` — will fail

**Spec drift risk:**
- `Plans/dependency-linking/requirements.md` implementation delta section references `portal/Backend/` and `portal/Frontend/` paths that don't match current `Source/Backend/` and `Source/Frontend/` layout. This is a stale path artifact from an older architecture. Future agents following this plan will be misled.
