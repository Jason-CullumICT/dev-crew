# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Architecture Map

Three distinct implementation zones, each tracing to a different spec:

| Zone | Spec | FRs | Notes |
|------|------|-----|-------|
| `Source/` | `Specifications/workflow-engine.md` | FR-WF-001…013 + FR-dependency-* | Self-Judging Workflow Engine (in-memory store) |
| `portal/` | `Specifications/dev-workflow-platform.md` | FR-001…069 | Dev Workflow Platform (SQLite-backed) |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001…010 | Orchestrator infrastructure |

The traceability enforcer (`tools/traceability-enforcer.py`) **only scans `Source/` and `E2E/`**. It cannot verify portal/ or platform/ coverage. Default run targets most-recently-modified `Plans/**/requirements.md` — currently `Plans/self-judging-workflow/requirements.md` (13 FRs). Neither portal/ nor tiered-merge-pipeline requirements are validated by the gate.

## Known P1/P2 Findings (first audit — 2026-10-07)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| QO-001 | P1 | Traceability enforcer blindspot: excludes `portal/` and `platform/`; default gate always passes despite 89 FRs outside scan scope | OPEN |
| QO-002 | P2 | Duplicate frontend test files: WorkItemDetailPage and WorkItemListPage each exist at two paths with different content | OPEN |
| QO-003 | P2 | FR-TMP-008 (Worker Container Prerequisites — `gh` CLI in Dockerfile.worker) has no traceability reference anywhere | OPEN |
| QO-004 | P3 | workflow.ts dependency catch block (line 330) omits logger.error for 400/404/409 error paths | OPEN |
| QO-005 | P3 | Two eslint-disable-next-line suppressions without documentation: useWorkItems.ts:63, DependencyPicker.tsx:82 | OPEN |
| QO-006 | P4 | DebugPortalPage.tsx uses non-standard Verifies comment ("dev-crew debug portal" not FR-XXX) | OPEN |
| QO-007 | P4 | FR-0004/FR-0007 notation ambiguity: platform spec uses FR-XXXX for both requirement IDs and seeded entity IDs | OPEN |

## Useful File Paths

- Active traceability enforcer target: `Plans/self-judging-workflow/requirements.md`
- Backend logger abstraction: `Source/Backend/src/utils/logger.ts` (canonical) + `Source/Backend/src/logger.ts` (compat re-export)
- Dependency service: `Source/Backend/src/services/dependency.ts` (315 lines)
- Catch block with logging gap: `Source/Backend/src/routes/workflow.ts:330-351`
- Duplicate test roots: `Source/Frontend/tests/*.test.tsx` vs `Source/Frontend/tests/pages/*.test.tsx`

## Spec Coverage Trend

- workflow-engine.md: 13/13 = **100%** (enforcer-verified)
- dev-workflow-platform.md: 74/76 = **97.4%** (manual scan of portal/ + Source/)
- tiered-merge-pipeline.md: 9/10 = **90%** (manual scan of platform/ — FR-TMP-008 missing)
- Effective enforcer gate coverage: **13/102 total FRs** = only 12.7% of requirements gated

## Common Violations

- The react-hooks/exhaustive-deps eslint-disable pattern appears in both a hook and a component — worth watching for expansion.
- No `console.log` violations found in production source (good).
- No hardcoded secrets found (good — DebugPortalPage uses `import.meta.env.VITE_PORTAL_URL`).
- No TODO/FIXME/HACK comments found in source.
- All files modified in last 14 days have at least one Verifies comment.
