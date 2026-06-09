# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-06-09 — First Full Audit

### Repository Structure
This project has **two separate applications**:
- `Source/` — Workflow Engine (work items, assessment pods, in-memory store)
- `portal/` — Dev Workflow Platform (feature requests, bugs, cycles, SQLite)

Always scan BOTH when checking traceability. The enforcer only scans `["Source", "E2E"]` by default.

### Traceability Enforcer Limitations
- **Critical**: `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]` — `portal/` is excluded. Plans/orchestrated-dev-cycles, Plans/dev-cycle-traceability, Plans/dependency-linking, and Plans/duplicate-deprecated-status all target `portal/` and will always report failure until `portal` is added to `source_dirs`.
- **Scope**: Enforcer defaults to the most-recently-modified `Plans/*/requirements.md`. Only `Plans/self-judging-workflow/requirements.md` is checked in default mode. 7 of 8 active plans are skipped.
- **False IDs**: Enforcer regex `FR-[A-Z0-9-]+` also matches data IDs like `FR-0002` that appear in plan prose (not as implementation targets), causing phantom failures.

### FR Namespaces in Use
| Namespace | Where | What |
|-----------|-------|------|
| `FR-WF-001..013` | Plans/self-judging-workflow | Source/ workflow engine |
| `FR-dependency-*` | Plans/dependency-linking | Mixed: Source/ and portal/ |
| `FR-033..069` | Plans/orchestrated-dev-cycles, dev-cycle-traceability | portal/ only |
| `FR-DUP-01..13` | Plans/duplicate-deprecated-status | portal/ only |
| `FR-001..069` (spec) | Specifications/dev-workflow-platform.md | Never verified by enforcer |

### Files With No Traceability (Recently Added)
- `portal/Backend/src/routes/teamDispatches.ts` — P3, needs FR link
- `portal/Frontend/src/pages/TeamsPage.tsx` — P3, needs FR link
- `portal/Frontend/src/components/common/RepoSelector.tsx` — P4

### Duplicate Test Files
`Source/Frontend/tests/` has both root-level and `pages/` subdirectory versions of:
- `WorkItemDetailPage.test.tsx`
- `WorkItemListPage.test.tsx`
Root-level copies appear stale. Confirm with jest config glob and delete stale copies.

### Fast Audit Paths
- Traceability enforcer pass (self-judging): `python3 tools/traceability-enforcer.py`
- Full portal check: add `--file Plans/orchestrated-dev-cycles/requirements.md` etc. (will fail until portal/ added to source_dirs)
- Source/ Verifies count: `grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -v "/tests/" | wc -l` → ~162 (2026-06-09)
- portal/ Verifies count: `grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx" | grep -v "/tests/" | wc -l` → ~300 (2026-06-09)

### Spec Coverage Trend
- First audit — baseline established
- Self-judging-workflow plan: 100%
- Portal-targeting plans: ~95%+ actual, but 0% reported by enforcer (tool gap, not code gap)
- Specifications/dev-workflow-platform.md FR-001..069: 0% tracked (no enforcer support for spec-level FRs)

### Architecture Rule Status
- No `console.log` in production: ✅ Both apps use logger abstractions
- No hardcoded secrets: ✅ Clean
- No direct DB from routes: ✅ Both apps use service layer
- Error handling: ⚠️ `Source/Frontend/src/api/client.ts:26` silently catches JSON parse errors without logging — minor but document it
- Large files: `Source/Frontend/src/pages/WorkItemDetailPage.tsx` at 426 lines (watch for 500-line breach)
