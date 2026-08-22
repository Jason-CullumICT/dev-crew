# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-08-22

### Spec Coverage Trend
- First audit — baseline established
- **FR-WF-001 to FR-WF-013** (canonical workflow engine requirements): **13/13 = 100%** — PASS
- **FR-dependency-*** (dependency tracking extension): **15/16 = 94%** — FR-dependency-seed untraced
- **FR-TMP-001 to FR-TMP-010** (tiered merge pipeline): **0/10 = 0%** — not implemented in Source/
- **dev-workflow-platform.md FR-001..FR-069**: in-scope for a _different_ system (SQLite portal), not Source/

### Key File Paths
- Canonical requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013)
- Extended requirements: `Specifications/dev-workflow-platform.md` (FR-dependency-* and FR-001..FR-069)
- Tiered pipeline spec: `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010)
- Traceability enforcer: `tools/traceability-enforcer.py` — reads Plans/self-judging-workflow/requirements.md
- Test directories: `Source/Backend/tests/`, `Source/Frontend/tests/`

### Common Pattern Violations Found
- Duplicate test files: `Source/Frontend/tests/{Page}.test.tsx` (root) AND `Source/Frontend/tests/pages/{Page}.test.tsx` — both present for WorkItemDetailPage and WorkItemListPage
- E2E test stub: `Source/E2E/package.json` has `"test": "echo 'Error: no test specified' && exit 1"` — E2E not wired
- eslint-disable in production hook: `Source/Frontend/src/hooks/useWorkItems.ts:63`
- FR-TMP-* requirements have no implementation — tiered merge pipeline is spec-only

### Useful Context for Future Audits
- Traceability enforcer only checks FR-WF-* against Plans/self-judging-workflow/requirements.md — it does NOT check FR-dependency-* or FR-TMP-*
- All architecture rules (no console.log, no empty catch) are clean in the workflow engine source
- Frontend Verifies comments use varied prefixes: FR-WF-009..012 for pages, FR-dependency-* for dependency components, "dev-crew debug portal" for DebugPortalPage (non-standard)
- No hardcoded secrets found; vite.config.ts localhost proxy URL is expected dev config
