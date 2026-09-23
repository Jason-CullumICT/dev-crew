# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-23

### Spec Coverage Trend
- **self-judging-workflow plan**: 100% — all 13 FRs traced in Source/
- **dev-workflow-platform plan**: 0% — 34 FRs entirely unimplemented; different domain from current codebase
- **dependency-linking plan**: 0% — 7 stale FR IDs referencing `portal/` codebase that no longer applies

### Key Discovery: Two Separate Domains in One Repo
`Specifications/workflow-engine.md` (Self-Judging Workflow Engine) is what Source/ implements — FR-WF-xxx IDs.  
`Specifications/dev-workflow-platform.md` (Development Workflow Platform) was a separate planned product — FR-001 to FR-069 — never built in Source/. Do not confuse the two.

### Traceability Enforcer Scope Limitation (Critical)
`python3 tools/traceability-enforcer.py` (no args) auto-selects the **most recently modified** `requirements.md` via mtime. As of this audit, it selects `Plans/self-judging-workflow/requirements.md`. This means:
- Running the gate without `--plan` only checks self-judging-workflow
- `dev-workflow-platform` and `dependency-linking` plans silently fail
- **Always specify `--plan self-judging-workflow` in CLAUDE.md gates until multi-plan enforcement is added**

### Useful File Paths for Future Audits
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`
- Stale/legacy plan: `Plans/dependency-linking/requirements.md` (references portal/ codebase)
- Unimplemented spec: `Specifications/dev-workflow-platform.md`
- Logger canonical: `Source/Backend/src/utils/logger.ts` (wrapper: `Source/Backend/src/logger.ts`)
- Frontend tests with full coverage: `Source/Frontend/tests/` (all 6 top-level + components/ + pages/ subdirs have Verifies)
- Frontend components WITHOUT tests: Layout.tsx, PriorityBadge.tsx, StatusBadge.tsx, TypeBadge.tsx, DebugPortalPage.tsx

### Pattern Violations to Re-Check Next Audit
1. `Source/Frontend/src/api/client.ts:26` — `.catch(() => ({}))` silent JSON suppression
2. `Source/Backend/src/routes/workflow.ts` — all catch blocks respond inline instead of calling `next(err)`
3. `Source/Frontend/src/hooks/useWorkItems.ts:63` — eslint-disable without rationale comment
4. Duplicate logger: `Source/Backend/src/logger.ts` wraps `Source/Backend/src/utils/logger.ts`

### Common Verifies ID Formats in This Project
- `FR-WF-001` to `FR-WF-013` — self-judging-workflow plan (active)
- `FR-dependency-*` — dependency-linking feature (implemented, passes enforcer)
- `FR-001` to `FR-069` — dev-workflow-platform spec (NOT implemented in Source/)
- `FR-0002` etc. — old dev-workflow-platform IDs from portal/ codebase (stale, in dependency-linking plan)
