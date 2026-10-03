# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-10-03 — First Full Audit

**Repository architecture (two separate apps):**
- `Source/` — the self-judging workflow engine (FR-WF-001—013). Small app; traceability enforcer covers it 100%.
- `portal/` — the dev workflow platform (FR-001—089+). Large app (~60 source files, 277+ Verifies annotations). NOT scanned by the enforcer.
- `platform/` — orchestrator infrastructure (FR-TMP-001—010). Also not scanned.

**Critical enforcer limitation:**
- `tools/traceability-enforcer.py:69-70` hardcodes `source_dirs = ["Source", "E2E"]`.
- Running the enforcer against portal plans always reports 100% failure (false negatives) even though portal/ is well-annotated.
- Effective enforcement coverage: 13 of ~156 specified FRs (8.3%).

**FR ID collision — confirmed:**
- FR-070 is defined in BOTH `Plans/image-upload/requirements.md` (ImageAttachment type) and `Plans/orchestrator-cycle-dashboard/requirements.md` (OrchestratorCyclesPage). These are completely different requirements.
- All FR-070 references in portal/ are ambiguous.

**Ghost FRs — confirmed:**
- FR-090 through FR-095 are referenced in `portal/Frontend/src/components/orchestrator/` but appear in no spec document or plan requirements file. Code was written before spec.

**Untraced recently-modified files:**
- `portal/Backend/src/routes/teamDispatches.ts` (85 lines, 0 Verifies comments)
- `portal/Frontend/src/pages/TeamsPage.tsx` (406 lines, 0 Verifies comments)

**Useful paths for future audits:**
- Portal backend source: `portal/Backend/src/routes/`, `portal/Backend/src/services/`
- Portal frontend: `portal/Frontend/src/pages/`, `portal/Frontend/src/components/`
- Main spec: `Specifications/dev-workflow-platform.md` (FR-001—069)
- Enforcer scan bug: `tools/traceability-enforcer.py:69-70`
- Inspector config: `Teams/TheInspector/inspector.config.yml`

**Spec coverage trend:** Starting baseline — enforcement is at 8.3% of total requirements. Actual implementation coverage is high (~85%) but invisible to the enforcer.

**No console.log violations found** in any backend src/ directories. Logging abstraction is used correctly.

**Large files:** `portal/Backend/src/services/cycleService.ts` (526 lines), `portal/Backend/src/services/featureRequestService.ts` (506 lines) — watch for further growth.
