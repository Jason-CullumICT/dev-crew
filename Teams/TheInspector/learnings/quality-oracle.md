# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-27 — Full Audit

### Spec Coverage Trend

| Spec file | FRs in spec | Traced in source | Coverage |
|-----------|------------|-----------------|----------|
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` (FR-dependency-* only) | ~13 | ~13 | ~100% |

**Coverage trend**: BASELINE (first run). Primary spec orphaned; plan-level specs fully traced.

---

### Critical Discovery: Two-Tier Spec System

This project has a two-tier spec system:
1. **Primary domain spec**: `Specifications/dev-workflow-platform.md` — describes a full dev lifecycle platform (feature requests, bug reports, dev cycles, SQLite backend, pipeline orchestration FR-001–FR-069). **This spec describes a system that was never built.**
2. **Plan-level specs**: `Plans/*/requirements.md` — per-feature requirement files with FR-WF-*, FR-dependency-* IDs. **These describe what was actually built.**

The implementation is a work item workflow engine (in-memory store, FR-WF-001 to FR-WF-013 + dependency features), which aligns to `Specifications/workflow-engine.md` and the plan-level specs — NOT the primary spec.

### Traceability Enforcer Behaviour

- `tools/traceability-enforcer.py` auto-selects the most recently modified `requirements.md` in `Plans/`
- When all files have the same mtime (common after a fresh clone/checkout), selection is non-deterministic
- Running `python3 tools/traceability-enforcer.py` with no args → targets `Plans/self-judging-workflow/requirements.md` (13 FRs → PASSES)
- Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` → 76 FRs → **FAILS (all missing)**
- The enforcer regex `FR-[A-Z0-9-]+` over-matches: picks up spec cross-references in prose (e.g., "FR-070 — FR-085") as requirement IDs, causing false failures when running against `Plans/dependency-linking/requirements.md`

### Useful File Paths for Future Audits

- Primary domain spec: `Specifications/dev-workflow-platform.md` (76 FRs)
- Workflow engine spec (matches implementation): `Specifications/workflow-engine.md`
- Plan requirements files: `Plans/*/requirements.md` (8 files, all same mtime as of this run)
- Source root: `Source/Backend/src/`, `Source/Frontend/src/`, `Source/Shared/`
- Test dirs: `Source/Backend/tests/`, `Source/Frontend/tests/`
- Traceability enforcer: `tools/traceability-enforcer.py`

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` in 2 frontend files (useWorkItems.ts, DependencyPicker.tsx)
- Duplicate test files for WorkItemDetailPage and WorkItemListPage (both `tests/` and `tests/pages/` subdirs)
- Implementation Delta table in `Plans/dependency-linking/requirements.md` stale (FR-dependency-api-types marked missing but is implemented)

### P1/P2 Findings to Re-Verify on Next Run

| ID | Finding | File | Status |
|----|---------|------|--------|
| QO-001 | Enforcer targets wrong spec; primary spec 0% | `tools/traceability-enforcer.py` | OPEN |
| QO-002 | Primary spec orphaned from implementation | `Specifications/dev-workflow-platform.md` | OPEN |
| QO-003 | Enforcer regex over-matches prose FR references | `tools/traceability-enforcer.py:63` | OPEN |
| QO-004 | Non-deterministic enforcer target when mtimes tie | `tools/traceability-enforcer.py:49-57` | OPEN |
| QO-005 | Duplicate test files for WorkItemDetailPage + ListPage | `Source/Frontend/tests/pages/` | OPEN |
