# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-10-18 — Full Audit

**Spec Coverage Trend:** First baseline run. Active plan (self-judging-workflow) 100% traced. Combined active plans (self-judging-workflow + dependency-linking) 78% coverage.

**Key Paths for Fast Future Audits:**
- Active requirements: `Plans/self-judging-workflow/requirements.md` (13 FRs) — 100% traced
- Partially implemented: `Plans/dependency-linking/requirements.md` (16/24 FRs traced)
- Domain specs: `Specifications/dev-workflow-platform.md` — 69 FRs, ALL unimplemented (different product than built)
- Traceability enforcer: `tools/traceability-enforcer.py` — only checks most-recently-modified plan, not all plans
- Source root: `Source/Backend/src/` and `Source/Frontend/src/`
- Verifies pattern in source: `FR-WF-*` and `FR-dependency-*`

**Common Pattern Violations Found:**
1. `eslint-disable-next-line react-hooks/exhaustive-deps` in two frontend files (suppresses stale closure guards)
2. Dashboard activity response (`GET /api/dashboard/activity`) returns `{data}` without pagination envelope
3. Plan FRs used as traceability IDs rather than Specification FRs — acceptable but weakens spec→plan→source chain

**Untraced dependency-linking FRs (8 missing):**
- `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085`, `FR-dependency-seed`

**Architecture Rules — Status:**
- No direct DB calls from route handlers ✓ (in-memory store, no DB)
- No console.log in production source ✓ (logger abstraction used throughout)
- No hardcoded secrets ✓
- List endpoints return data wrappers ✓ (PaginatedResponse on workItems, {data:} on dashboard)
- Activity pagination envelope missing ✗ (P2)
- eslint-disable without docs ✗ (2 instances, P2)

**Grade: C** (1 P1, 4 P2 findings, 78% active spec coverage)
