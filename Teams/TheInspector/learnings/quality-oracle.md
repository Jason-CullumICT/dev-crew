# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-10-23

### Spec Coverage Summary
- **Active spec** (`Plans/self-judging-workflow/requirements.md`, FR-WF-001..013): 13/13 = **100%** ✅
- **Orphaned spec** (`Specifications/dev-workflow-platform.md`, FR-001..069 + FR-dependency-*): ~85 rows, **0% implemented** in `Source/` ⚠️

### Active Requirements Source
The enforcer targets `Plans/self-judging-workflow/requirements.md` (most-recently-modified).
The codebase uses `FR-WF-XXX` and `FR-dependency-XXX` identifiers — NOT `FR-\d+`.

### Key File Paths
- Canonical spec: `Specifications/workflow-engine.md` (self-judging workflow engine)
- Active plan/requirements: `Plans/self-judging-workflow/requirements.md`
- Orphaned spec: `Specifications/dev-workflow-platform.md` (feature-request mgmt platform, not implemented)
- Traceability enforcer: `tools/traceability-enforcer.py`
- Backend source: `Source/Backend/src/`
- Frontend source: `Source/Frontend/src/`
- Test dirs: `Source/Backend/tests/`, `Source/Frontend/tests/`

### Known Issues
1. **Config regex mismatch**: `inspector.config.yml` uses `FR-\\d+` but code uses `FR-WF-\d+` — grep-based coverage will show 0%.
2. **Enforcer targets most-recent plan**: As new plans are added, the enforcer shifts target — silently ignoring prior requirements.
3. **Route handlers bypass service layer**: `workItems.ts`, `workflow.ts`, `intake.ts` import `workItemStore` directly.
4. **No OTel tracing**: CLAUDE.md requires it; no `@opentelemetry` packages in Source/.
5. **Duplicate frontend tests**: Both root-level and `pages/` subdirectory have `WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx`.

### Useful Patterns
- `grep -rn "Verifies:" Source/` — find all traceability comments
- `grep -rn "FR-WF\|FR-dependency" Source/` — find FR references
- `python3 tools/traceability-enforcer.py` — check active plan coverage
- `git log --since="14 days ago" --name-only --pretty=format:""` — recently changed files

### Spec Drift Trend
- First audit: significant drift between `dev-workflow-platform.md` and `Source/` (different domains)
- Active spec coverage is healthy (100%)
