# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-08-21

### Spec Coverage Trend
- **First run** — baseline established.
- FR-WF-001–013 (Plans/): 13/13 = **100%** traced in source ✓
- FR-dependency-* (Specifications/dev-workflow-platform.md): 14/14 = **100%** traced ✓
- FR-TMP-001–010 (Specifications/tiered-merge-pipeline.md): 0/10 = **0%** — no source traces
- FR-001–FR-069 (Specifications/dev-workflow-platform.md): 0/69 — describes a **different product** (portal w/ SQLite); not applicable to Source/
- Effective coverage for Source/ = **~58%** (14 of 24 spec-level IDs with source relevance)

### Critical Structural Issue
The primary FR definitions for the running application live in **Plans/**, not **Specifications/**.  
- `Specifications/workflow-engine.md` = narrative only, zero numbered FR-* IDs  
- `Plans/self-judging-workflow/requirements.md` = FR-WF-001–013 (the real traceability anchor)  
- This inverts the CLAUDE.md rule: "Specs are source of truth → implementation traces to specs"

### Useful File Paths for Faster Future Audits
| Purpose | Path |
|---------|------|
| Workflow engine requirements (FR-WF-*) | `Plans/self-judging-workflow/requirements.md` |
| Dependency requirements (FR-dependency-*) | `Specifications/dev-workflow-platform.md` lines 461–482 |
| Pipeline requirements (FR-TMP-*) | `Specifications/tiered-merge-pipeline.md` |
| Stale portal specs (FR-001–069) | `Specifications/dev-workflow-platform.md` lines 341–459 |
| Traceability enforcer | `tools/traceability-enforcer.py` (scans Plans/ only — see QO-005) |
| Express app route registration | `Source/Backend/src/app.ts` |
| All Verifies IDs in source | `grep -rn "// Verifies:" Source/` |

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in 2 frontend files (not critical but monitor)
- No `console.log` violations in production source — logger abstraction properly used ✓
- No hardcoded secrets found ✓
- No empty catch blocks found ✓
- No files over 500 lines ✓

### Open Issues Carry-Forward
- **QO-001 (P1)**: GET /api/search not wired into app.ts (FR-dependency-search)
- **QO-002 (P1)**: FR-WF-* requirement IDs defined in Plans/, not Specifications/
- **QO-003 (P2)**: Stale portal specs (FR-001–069) need archiving
- **QO-004 (P2)**: FR-TMP-001–010 have zero source traces
- **QO-005 (P2)**: Traceability enforcer scope is too narrow (13 of 97 spec requirements scanned)
