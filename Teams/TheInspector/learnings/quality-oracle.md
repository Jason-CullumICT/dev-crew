# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-10-17

### Spec Coverage Trend
- Traceability enforcer only covers Plans/self-judging-workflow/requirements.md (13 FRs = ~12% of total spec surface)
- Total spec surface: ~109 requirements across 3 spec files + 1 plans file
- portal/ has ~1074 Verifies occurrences across 108 files — rich traceability but against non-spec IDs
- Source/ has ~302 Verifies occurrences against FR-WF-* — correct for self-judging-workflow plan

### Key Useful File Paths
- Traceability enforcer: `tools/traceability-enforcer.py` — scans most-recently-modified Plans/*/requirements.md
- Specs: `Specifications/dev-workflow-platform.md` (FR-001–FR-069 + FR-dependency-*), `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010), `Specifications/workflow-engine.md` (narrative)
- Portal backend routes with direct DB: `portal/Backend/src/routes/teamDispatches.ts` (inline SQL), `portal/Backend/src/routes/featureRequests.ts`, `bugs.ts`, `cycles.ts`, `search.ts`, `dashboard.ts`, `features.ts`, `learnings.ts`, `pipelines.ts`
- console.log violations: `platform/orchestrator/lib/workflow-engine.js` (174 instances)
- Empty catch blocks: `portal/Frontend/src/components/bugs/BugDetail.tsx:82`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`, `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- Large files: `portal/Backend/src/services/cycleService.ts` (526 lines), `portal/Backend/src/services/featureRequestService.ts` (506 lines)

### Common Pattern Violations Found
1. **Enforcer scope gap** — enforcer only covers one plan file, not the Specifications/ directory
2. **Direct DB in route handlers** — portal routes call getDb() directly; teamDispatches.ts has inline SQL
3. **console.* in platform orchestrator** — 174 violations, should use structured logger
4. **FR-dependency ID mismatch** — portal uses FR-dependency-cycle/dispatch/linking/ready; spec defines FR-dependency-types/schema/service/dispatch-gating/etc. No overlap.
5. **Undocumented FRs in portal** — FR-073–FR-079 and FR-DUP-* exist in code/plan reports but not in Specifications/
6. **eslint-disable in Source/Frontend** — DependencyPicker.tsx and useWorkItems.ts suppress react-hooks/exhaustive-deps

### Three Codebases, Three Traceability Schemes
- **Source/** → Plans/self-judging-workflow/requirements.md (FR-WF-*) — correctly enforced
- **portal/** → Specifications/dev-workflow-platform.md (FR-001–069 + FR-dependency-*) — NOT enforced; ID naming inconsistent
- **platform/** → Specifications/tiered-merge-pipeline.md (FR-TMP-*) — NOT enforced by tool; manually traced in code
