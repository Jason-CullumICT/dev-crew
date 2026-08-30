# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### Run 1 — 2026-08-30 (Full Audit)

**Spec coverage trend:** The traceability enforcer only scans `Plans/*/requirements.md` (most-recent fallback). It completely misses `Specifications/` — which contains 74 defined FRs in `dev-workflow-platform.md` with ZERO implementation in `Source/`. This is a structural gap, not a code gap.

**Active requirements scope (enforcer):** FR-WF-001–013 (Plans/self-judging-workflow) + FR-dependency-* (Plans/dependency-linking) — 100% covered.

**Primary Spec corpus:** `Specifications/dev-workflow-platform.md` — 74 FRs, 0% traced to Source/.

## File Map (for fast future audits)

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | Active enforced requirements (FR-WF-*) |
| `Plans/dependency-linking/requirements.md` | Dependency feature requirements (FR-dependency-*) |
| `Specifications/dev-workflow-platform.md` | 74-FR platform spec — NOT currently implemented in Source/ |
| `Specifications/workflow-engine.md` | Informal spec — what Source/ actually implements |
| `tools/traceability-enforcer.py` | Scans most-recently-modified Plans/*/requirements.md — does NOT scan Specifications/ |
| `Source/Backend/src/logger.ts` | Compat wrapper re-exporting utils/logger |
| `Source/Backend/src/utils/logger.ts` | Real structured logger implementation |

## Common Pattern Violations Found

1. **Inline type definitions in services** — `AssessmentResult` in `assessment.ts`, `RouteResult` in `router.ts` — should be in `Source/Shared/types/`
2. **eslint-disable** in production: `DependencyPicker.tsx:82`, `useWorkItems.ts:63` (react-hooks/exhaustive-deps)
3. **Duplicate test files** — WorkItemDetailPage and WorkItemListPage have both top-level AND `pages/` subdirectory test files
4. **Two logger import paths** — most files use `../logger` (compat), `workItemStore.ts` uses `../utils/logger` directly

## Structural Notes

- `Specifications/dev-workflow-platform.md` describes a completely different system than what's in Source/ (feature request management vs. work item workflow engine). This spec appears to be a prior/alternate vision, not abandoned but never started.
- `Plans/dependency-linking/requirements.md` references `portal/Backend/src/` paths — the actual implementation is in `Source/Backend/src/` — the plan was adapted to a different codebase and never updated.
- The traceability enforcer's "PASSED" verdict is correct but narrowly scoped; the broader spec debt is invisible to it.
