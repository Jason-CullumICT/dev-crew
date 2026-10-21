# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-10-21 — First full audit

#### Spec Coverage Trend
- Active-plan spec (FR-WF-001 to FR-WF-013): **100%** — enforcer confirms all 13 FRs traced.
- Broader Specifications/ coverage: enforcer does NOT scan Specifications/; FR-001 to FR-069 in dev-workflow-platform.md target portal/, not Source/.
- FR-dependency-* in Source/ are spec misattributions — the plan targets portal/Backend but Source/Backend uses the same FR IDs.

#### Common Pattern Violations Found
1. **Route-to-store shortcut**: Route handlers in `workItems.ts`, `workflow.ts`, `intake.ts` directly import `workItemStore` — bypasses service layer. All three files do this.
2. **Silent catch for JSON parse**: `Source/Frontend/src/api/client.ts:26` uses `.catch(() => ({}))` without a comment explaining the intentional suppression.
3. **eslint-disable in production hooks**: `useWorkItems.ts:63` and `DependencyPicker.tsx:82` suppress react-hooks/exhaustive-deps.

#### Useful File Paths for Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` — only checks most recently modified `requirements.md`
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (13 FRs)
- Dependency plan: `Plans/dependency-linking/requirements.md` — targets portal/, not Source/
- Specifications overview: `Specifications/workflow-engine.md` (domain description, no FR IDs)
- Source test dirs: `Source/Backend/tests/`, `Source/Frontend/tests/`
- Missing tests: `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`

#### Architecture Insight
- The project has TWO distinct systems: Source/ (self-judging workflow engine, in-memory) and portal/ (debug UI with SQLite backend). Specifications/dev-workflow-platform.md describes portal/, not Source/.
- The traceability enforcer's auto-select of most-recent requirements.md is the correct scope for Source/.
- FR-dependency-* in Source/ are an adapted port of the portal/ dependency feature — they lack their own Source/-scoped spec.

## Learnings

- **Enforcer scope**: Always check which plan file the enforcer selects. Run `python3 tools/traceability-enforcer.py` and confirm "Targeting requirements from: Plans/self-judging-workflow/requirements.md"
- **Spec system mapping**: dev-workflow-platform.md → portal/ system; workflow-engine.md + Plans/self-judging-workflow → Source/ system
- **Route-layer antipattern**: The direct store access in routes was established from the start — route handlers act as thin controllers calling store + services in the same layer. This is a consistent pattern but violates CLAUDE.md's service-layer rule.
- **No hardcoded secrets found**: API base URL uses `import.meta.env.VITE_API_BASE_URL` with a safe default of `/api`.
