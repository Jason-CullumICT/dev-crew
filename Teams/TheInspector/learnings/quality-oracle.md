# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-07 — Full Audit

### Spec Coverage Trend
- Active Plans coverage: **93%** (27/28 requirements; FR-dependency-seed missing)
- Full Specifications/ coverage: ~28% (Specifications/dev-workflow-platform.md is orphaned — describes a different product)

### Key Architecture Facts
- **Two-system problem**: `Specifications/dev-workflow-platform.md` (FR-001–FR-069) describes a feature-request/bug/cycle platform with SQLite. The **current Source/ is a completely different product**: a self-judging work-item workflow engine with in-memory store. These should not be treated as the same system.
- **Active specs**: `Specifications/workflow-engine.md` (descriptive, no FR IDs) + `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013) + `Plans/dependency-linking/requirements.md` (FR-dependency-*).
- **Traceability namespace**: Source uses `FR-WF-XXX` (workflow engine) and `FR-dependency-XXX` (dependency linking). Not `FR-001`–`FR-069`.

### Enforcer Bugs (both are P1)
1. **False FR ID extraction**: `tools/traceability-enforcer.py` regex `FR-[A-Z0-9-]+` matches prose text (work item docIds like FR-0002, spec cross-refs like FR-070). Fix: limit to table column 1 only.
2. **Single-plan scope**: Enforcer picks the most recently modified requirements.md and checks only that one. All plans share the same mtime so selection is non-deterministic. Add `--all-plans` mode for CI.

### Open Requirements
- `FR-dependency-seed`: Zero Verifies references in Source/. Plans file explicitly flags it ❌ Missing. Needs a seed function in Source/Backend/src/store/seedData.ts calling addDependency for 4 documented relationships.

### Architecture Violations
- Route handlers (`workItems.ts`, `workflow.ts`, `intake.ts`) call `store.*` directly, bypassing service layer. CLAUDE.md prohibits this. Approve/reject/dispatch logic in `workflow.ts` should move to a `workflowActions.ts` service.

### Test Quality
- **Duplicate tests**: Two parallel test hierarchies exist for the same frontend pages: `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` (similarly for WorkItemListPage). Root-level files have more assertions. Choose one canonical location and consolidate.
- All test files have assertions (lowest: BlockedBadge.test.tsx with 4). No skipped/todo tests found.

### Pattern Violations
- `Source/Frontend/src/api/client.ts:26`: `.catch(() => ({}))` swallows JSON parse errors silently (CLAUDE.md architecture violation — needs comment explaining intent)
- `useWorkItems.ts:63`, `DependencyPicker.tsx:82`: eslint-disable suppressing react-hooks/exhaustive-deps without rationale

### Useful File Paths
- Active requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Store (data layer): `Source/Backend/src/store/workItemStore.ts`
- Route handlers (arch violation sites): `Source/Backend/src/routes/workflow.ts`, `workItems.ts`, `intake.ts`
- Dependency service: `Source/Backend/src/services/dependency.ts` (clean, well-traced)

### Common Pattern Violations Found
1. Prose-matching regex in traceability enforcer → false positives
2. Route-to-store direct access (no service layer for CRUD ops)
3. Duplicate test file hierarchies in Frontend/tests/

### Grading
- C grade (2 P1s in tooling, 4 P2s in code/process)
- Fixing QO-001 and QO-002 would likely recover to B (enforcer issues are tooling, not product bugs)
- Product code itself is clean: no console.log in prod, no hardcoded secrets, no empty catches that lose errors, structured logging used throughout
