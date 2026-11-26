# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-26

### Spec Coverage Trend
- Plans-level (FR-WF-* + FR-dependency-*): **96.5%** (28/29 requirements traced)
- Specifications/-level (FR-001–069): **0%** — Specifications/ never enforced by the tool
- Overall including Specifications/: **27.2%**

### Critical Tool Defect to Check First on Every Run
**The traceability enforcer regex only matches UPPERCASE identifiers.**
- Regex: `FR-[A-Z0-9-]+` (line ~65 of `tools/traceability-enforcer.py`)
- `FR-WF-001` ✅ matches (uppercase)
- `FR-dependency-service` ❌ does NOT match (lowercase letters)
- Fix: change to `FR-[A-Za-z0-9-]+`
- Until fixed: `--plan dependency-linking` returns 7 false-positive failures (seed-data IDs like FR-0002) instead of checking the 16 real requirements

### Enforcer is Single-Plan by Default
- Running `python3 tools/traceability-enforcer.py` only checks the **most recently modified** `Plans/*/requirements.md`
- With 19 plans in the repo, all other plans' requirements are silently skipped
- Always run with explicit `--plan` flags when checking non-default plans
- Known plans that need explicit checks:
  - `--plan self-judging-workflow` → FR-WF-001 to FR-WF-013 (13 FRs, all pass)
  - `--plan dependency-linking` → FR-dependency-* (16 FRs, 1 unimplemented: FR-dependency-search)

### Key Implementation Gaps (as of 2026-11-26)
1. **`GET /api/search` NOT registered in `Source/Backend/src/app.ts`** — test file `search.test.ts` explicitly documents this; tests WILL fail in CI
2. **Architecture rule violated:** `workItems.ts`, `workflow.ts`, `intake.ts` all call `store.*` directly from route handlers, bypassing the service layer

### Useful File Paths for Future Audits
| File | What to check |
|------|---------------|
| `Source/Backend/src/app.ts` | Which routes are registered; look for missing search, etc. |
| `Source/Backend/src/routes/workItems.ts` | Direct store calls (architecture rule) |
| `Source/Backend/src/routes/workflow.ts` | Direct store calls (architecture rule) |
| `Source/Backend/src/routes/intake.ts` | Direct store calls (architecture rule) |
| `Source/Frontend/src/api/client.ts:26` | Silent JSON catch — architecture rule violation |
| `Source/Frontend/src/hooks/useWorkItems.ts:63` | eslint-disable react-hooks/exhaustive-deps |
| `Source/Frontend/src/components/DependencyPicker.tsx:82` | eslint-disable react-hooks/exhaustive-deps |
| `Plans/dependency-linking/requirements.md` | Status table still references portal/ paths (stale) |
| `Specifications/dev-workflow-platform.md` | 74 FRs (FR-001–069) with 0% source traceability |

### FR Naming Conventions in This Repo
| Namespace | Format | Plan file | Coverage |
|-----------|--------|-----------|----------|
| Workflow Engine | `FR-WF-001` | Plans/self-judging-workflow/requirements.md | 100% |
| Dependency Linking | `FR-dependency-*` | Plans/dependency-linking/requirements.md | 93.75% |
| Platform (old) | `FR-001` to `FR-069` | Specifications/dev-workflow-platform.md | 0% |
| Tiered Pipeline | `FR-TMP-001` | Specifications/tiered-merge-pipeline.md | 0% |

### Common Patterns Found
- Backend services (assessment, router, dashboard, dependency, changeHistory) have clean `// Verifies:` traceability
- Route handlers (workItems, workflow, intake) have traceability comments but bypass service layer architecture rule
- Frontend hooks and pages have good FR-WF traceability
- No `console.log` in production code ✅
- No hardcoded secrets ✅
- No skipped tests ✅
- Logger abstraction (`src/utils/logger.ts`) used consistently throughout backend ✅
