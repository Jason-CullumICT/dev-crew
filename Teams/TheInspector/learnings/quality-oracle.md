# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-08-27 — First Full Audit Run

**Critical discovery: two-tier requirement system.**
This project uses BOTH `Plans/*/requirements.md` (active, enforced) AND `Specifications/*.md` (canonical but NOT enforced by the gate). The `traceability-enforcer.py` only reads Plans/ — it never touches Specifications/. Do not assume `TRACEABILITY PASSED` means Specifications/ are covered.

**FR-WF-* IDs live in Plans/, not Specifications/.**
Source code uses `// Verifies: FR-WF-001` through `FR-WF-013`. These are defined in `Plans/self-judging-workflow/requirements.md`, NOT in any Specifications/ document. `Specifications/workflow-engine.md` covers the same domain but has no formal FR ID table.

**Specifications/dev-workflow-platform.md is a different product.**
FR-001 through FR-069 describe a SQLite-based dev workflow platform (feature requests, bugs, dev cycles, pipeline orchestration). The current Source/ implementation is an in-memory Self-Judging Workflow Engine (FR-WF-*). These are two separate products. 69 FRs have zero source coverage and are effectively orphaned specs.

**FR-dependency-* are the only Specifications/ IDs implemented in Source/.**
These appear in both `Specifications/dev-workflow-platform.md` (under a "portal" context) and in `Source/` (under Source/Backend, Source/Frontend). They were adapted into the workflow engine implementation.

**pending_dependencies status is specified but not in the WorkItemStatus enum.**
`FR-dependency-dispatch-gating` requires `pending_dependencies` as a work item status, but it is absent from `Source/Shared/types/workflow.ts` WorkItemStatus enum and VALID_STATUS_TRANSITIONS. The dispatch endpoint returns 400 instead of transitioning to this status.

**Fast file paths for future audits:**
- Active requirements: `Plans/self-judging-workflow/requirements.md`
- Shared types (single source of truth): `Source/Shared/types/workflow.ts`
- All backend routes: `Source/Backend/src/routes/`
- All backend services: `Source/Backend/src/services/`
- Enforcer: `tools/traceability-enforcer.py` — scans Plans/ only
- Inspector config: `Teams/TheInspector/inspector.config.yml`

**Spec coverage trend (baseline 2026-08-27):**
- Plans/ coverage: 100% (13/13 FR-WF-* + 15/15 FR-dependency-*)
- Specifications/ coverage: ~16% (15/94 total spec FRs traced)
- tiered-merge-pipeline.md: 0% (10 FRs, none started)
- dev-workflow-platform.md main FRs: 0% (69 FRs, different product)

**Common patterns to check every run:**
1. `grep -roh "FR-WF-[0-9]*" Source/ | sort -u` — confirm all FR-WF IDs still in Plans/ requirements
2. `grep -L "Verifies:" Source/Backend/src/**/*.ts Source/Frontend/src/**/*.tsx` — unlinked production files
3. `grep -rn "eslint-disable" Source/Frontend/` — lint suppression audit
4. Check `WorkItemStatus` enum for `pending_dependencies` — still missing as of this audit
