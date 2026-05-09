# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-09 — Full Audit

### Project Structure (Critical)

This repo contains **two separate applications**, not one:

| App | Directory | Spec File | FR Namespace | Traceability |
|-----|-----------|-----------|--------------|-------------|
| Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | `FR-WF-XXX`, `FR-dependency-*` | Plans/self-judging-workflow/requirements.md |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001..FR-069`, `FR-dependency-*` | Plans/dev-workflow-platform/requirements.md |
| Orchestrator Infra | `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-XXX` | No requirements.md yet |

**The traceability enforcer only scans `Source/` and `E2E/`** — it will always report false failures for dev-workflow-platform plan (34 FRs show as missing because they live in `portal/`). Use `--plan self-judging-workflow` for the Source/ app.

### Key File Paths (fast lookup)

- Workflow engine types: `Source/Shared/types/workflow.ts`
- Workflow engine backend routes: `Source/Backend/src/routes/{workItems,workflow,dashboard,intake}.ts`
- Workflow engine metrics: `Source/Backend/src/metrics.ts`
- Dependency service (Source): `Source/Backend/src/services/dependency.ts`
- Portal shared types: `portal/Shared/types.ts` + `portal/Shared/api.ts`
- Portal dependency service: `portal/Backend/src/services/dependencyService.ts`
- Portal search route: `portal/Backend/src/routes/search.ts`

### Known Open Items (from Plan Implementation Deltas)

| FR ID | App | Status | Notes |
|-------|-----|--------|-------|
| FR-dependency-search | Source | ❌ OPEN | No `/api/search` route in Source/Backend/src/app.ts; test file exists but documents the gap. Tests WILL fail. |
| FR-dependency-metrics (histogram) | Source | ❌ OPEN | `dependencyCheckDuration` histogram missing from Source/Backend/src/metrics.ts — only 3 of 4 required metrics exist |
| FR-dependency-api-types | portal | ❌ OPEN | `UpdateBugInput` and `UpdateFeatureRequestInput` in portal/Shared/api.ts lack `blocked_by?: string[]`; forces `as any` in DependencyPicker |
| FR-dependency-seed | portal | ❌ OPEN | No `seed.ts` in `portal/Backend/src/database/` |

### Spec Coverage Trend

- Source/ (workflow engine): ~93% (26/28 active FR-WF/FR-dependency requirements)
- portal/ (dev workflow platform): ~95%+ with 2 known open items (FR-dependency-api-types, FR-dependency-seed)
- platform/ (tiered merge): FR-TMP-* not in enforcer scope — no requirements.md created yet

### Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` in:
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- Silent catch in `Source/Frontend/src/api/client.ts:26`: `response.json().catch(() => ({}))` swallows JSON parse errors (acceptable for UX but architecturally questionable)
- Duplicate test files with different content:
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`

### Spec ID Namespace Confusion

`FR-dependency-*` IDs are reused for BOTH apps:
- Source/ workflow engine has its own full implementation of dependency tracking
- portal/ dev platform has a parallel implementation in portal/Backend/src/services/dependencyService.ts

These are independent implementations for different apps sharing the same FR namespace. Not a defect, but can create confusion when running the enforcer.

### Large Files to Watch (portal/)

- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`: 550 lines
- `portal/Frontend/src/components/bugs/BugDetail.tsx`: 546 lines
- `portal/Backend/src/services/cycleService.ts`: 526 lines
- `portal/Backend/src/services/featureRequestService.ts`: 506 lines

### Useful Commands

```bash
# Correct enforcer command for Source/ app
python3 tools/traceability-enforcer.py --plan self-judging-workflow

# Will fail (scans Source/ but FR-001..FR-032 live in portal/)
python3 tools/traceability-enforcer.py --plan dev-workflow-platform
```
