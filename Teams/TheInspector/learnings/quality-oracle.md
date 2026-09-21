# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-09-21 — First Full Audit

**Spec coverage (Source/ system):** 100% for FR-WF-001..FR-WF-013 and all FR-dependency-* (per enforcer)

**Useful file paths:**
- Active requirements enforced: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013)
- Dependency-linking requirements: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Shared types: `Source/Shared/types/workflow.ts`
- Logger impl: `Source/Backend/src/utils/logger.ts`
- Logger compat wrapper: `Source/Backend/src/logger.ts`

## Learnings

### 1. Traceability enforcer targets only the most-recently-modified requirements.md

`tools/traceability-enforcer.py` auto-picks one file. For multi-plan projects, run explicitly:
```bash
python3 tools/traceability-enforcer.py --file Plans/<name>/requirements.md
```
Two full specs (`Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`) are NEVER auto-covered. They target `portal/` and `platform/`, not `Source/`.

### 2. Enforcer is too greedy on `FR-\d+` patterns

Running it against `Plans/dependency-linking/requirements.md` produces 7 false-positive MISSING errors (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) because these are item IDs embedded in description prose ("BUG-0010 blocked_by BUG-0003", "Spec reference: FR-070 — FR-085"), not actual FR requirement IDs. The actual requirement IDs in that file use `FR-dependency-*` format. The enforcer regex needs to match only IDs from the table column, not the full document body.

### 3. FR-dependency-* module drift: plan says portal/, code is in Source/

All `FR-dependency-*` requirements in `Plans/dependency-linking/requirements.md` reference `portal/Backend` and `portal/Frontend` as the target. The actual implementation lives in `Source/`. The delta document is stale. This is cosmetic (both systems implement the same features) but causes confusion and the implementation delta percentages are misleading.

### 4. Duplicate logger abstraction in Source/Backend

Two logger files co-exist:
- `Source/Backend/src/logger.ts` — a compat wrapper (default export)
- `Source/Backend/src/utils/logger.ts` — the actual logger (named export)

Most files import the compat wrapper; `workItemStore.ts` imports `utils/logger` directly. The compat wrapper was created to bridge different import styles but is now permanent tech debt.

### 5. Duplicate frontend test files

Two copies of tests exist for WorkItemDetailPage and WorkItemListPage:
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
- `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)

Both sets have `// Verifies:` traceability. Likely the `/pages/` versions supersede the root versions. Confirm with team and remove stale copies.

### 6. Known open items from Plans/dependency-linking/requirements.md delta

Per the delta table (status may have changed since delta was written):
- `FR-dependency-api-types`: ❌ Missing — `blocked_by?` not in UpdateBugInput/UpdateFeatureRequestInput
- `FR-dependency-seed`: ❌ Missing — No seed.ts in portal/Backend/src/database/

### 7. DebugPortalPage lacks canonical FR traceability

`Source/Frontend/src/pages/DebugPortalPage.tsx` uses `// Verifies: dev-crew debug portal — …` which doesn't match the `FR-XXX` pattern. No test file exists for this component. Low risk (iframe wrapper) but violates traceability rules.

### 8. Spec scan order for future audits

Run enforcer against all plans in sequence:
```bash
for f in Plans/*/requirements.md; do
  echo "=== $f ==="; python3 tools/traceability-enforcer.py --file "$f"; done
```
This surfaces all per-plan coverage gaps at once instead of the single-plan auto-pick.
