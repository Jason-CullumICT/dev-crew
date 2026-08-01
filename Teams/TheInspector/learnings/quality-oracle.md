# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-08-01 — First Full Audit

#### Project Structure
- **Source/** = self-judging workflow engine (in-memory store, WorkItem entity, TypeScript + React)
- **portal/** = dev-workflow-platform app (SQLite-based, Feature Request / Bug / Cycle management)
- **platform/** = orchestrator infrastructure (Docker, pipeline scripts)
- These are THREE SEPARATE applications in one repo; each has its own test suite, requirements, and spec set.

#### Traceability Enforcer Behaviour
- `tools/traceability-enforcer.py` auto-selects the **most-recently-modified** `Plans/*/requirements.md` file — NOT all active plans simultaneously.
- At this audit: it targeted `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013). All 13 passed.
- FR-dependency-* requirements in Source/ are never enforcer-gated — they have `// Verifies:` comments but no gate to verify the route actually works.
- **Critical flaw**: enforcer only checks comment *presence*, not that the feature runs. `search.test.ts` has the comment but the route is unwired → false PASS.

#### Source/ FR Namespacing
- Plans/self-judging-workflow/requirements.md → FR-WF-001..013 (all in Source/)
- Plans/dependency-linking/requirements.md → FR-dependency-* (split: portal/ and Source/ each have implementations)
- Plans/duplicate-deprecated-status/requirements.md → FR-DUP-01..13 (portal/ only — BugStatus/FeatureRequestStatus)
- Specifications/dev-workflow-platform.md → FR-001..069 (portal/ app)
- Specifications/tiered-merge-pipeline.md → FR-TMP-001..010 (platform/ orchestrator)
- Specifications/workflow-engine.md → narrative spec, no numbered FR-XXX IDs; requirements are in Plans/self-judging-workflow/requirements.md

#### Known Open Gaps (Source/ App)
1. `/api/search` route is NOT wired into `Source/Backend/src/app.ts` — test file is pre-written but tests will FAIL
2. `FR-dependency-dispatch-gating`: spec says set status to `pending_dependencies`; implementation returns HTTP 400 instead. `WorkItemStatus` enum has no `PendingDependencies` variant.
3. `dependencyCheckDuration` Histogram missing from `metrics.ts` (only 3 of 4 FR-dependency-metrics counters implemented)
4. `workItems.ts` route calls store functions directly rather than through a service layer (architecture violation)

#### Useful File Paths
- Traceability enforcer: `tools/traceability-enforcer.py`
- Plans with requirements files: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`, `Plans/duplicate-deprecated-status/`, `Plans/orchestrated-dev-cycles/`, `Plans/orchestrator-cycle-dashboard/`, `Plans/image-upload/`
- Source/ backend routes: `Source/Backend/src/routes/{workItems,workflow,dashboard,intake}.ts`
- Source/ backend metrics: `Source/Backend/src/metrics.ts`
- Dual logger: `Source/Backend/src/logger.ts` (adapter) wraps `Source/Backend/src/utils/logger.ts`
- Portal frontend tests: `portal/Frontend/tests/` (DependencySection.test.tsx and BlockedBadge.test.tsx are missing — portal gap, not Source/)

#### Spec Coverage Trend
- First audit: ~95% for Source/ (22/23 requirements traced; 1 unwired route)
- Grade: C (1 P1, 4 P2s)
