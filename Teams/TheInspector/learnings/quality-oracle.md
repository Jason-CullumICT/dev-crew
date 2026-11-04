# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-04

### Spec Coverage Trend

| Spec File | FRs Found | Implemented | Coverage |
|-----------|-----------|-------------|----------|
| `Specifications/dev-workflow-platform.md` | 76 | 0 | 0% |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | 0% |
| `Specifications/workflow-engine.md` | 0 | — | N/A |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | 100% |

**Root cause**: The Specifications/ folder describes an older system (Feature Request/Bug Report platform). The active implementation is the Self-Judging Workflow Engine from `Plans/self-judging-workflow`. Specifications/ files have never been archived or updated to reflect the current system.

**Overall spec coverage (enforcer gate)**: 100% for active plan. 0% for Specifications/*.

### Key Structural Discoveries

- **Traceability Enforcer is Plan-scoped, not Spec-scoped**: `tools/traceability-enforcer.py` resolves the most recently modified `Plans/*/requirements.md`. It will PASS even when all Specifications/ FRs are unimplemented. Run with `--file Specifications/<file>.md` to test against a specific spec.
- **Source uses non-standard FR IDs**: Source code uses `FR-WF-XXX` (self-judging-workflow plan), `FR-dependency-XXX` (27 unique IDs with NO anchor spec file), and old `FR-XXX` (dev-workflow-platform spec) — three distinct namespaces, only one of which has enforcer coverage.
- **FR-dependency-XXX IDs are unanchored**: 27 unique `FR-dependency-*` IDs appear in source `Verifies:` comments but do not exist in any spec or plan file. No enforcer can verify them.
- **Service layer architecture**: Route handlers (workItems.ts, workflow.ts, intake.ts) import `workItemStore` directly — no service layer intermediary. This is a persistent architecture rule violation.
- **No OpenTelemetry**: CLAUDE.md requires OTel tracing + traceparent header propagation. Zero OTel code exists in Source/.

### Useful File Paths

- Main spec (superseded): `Specifications/dev-workflow-platform.md` (76 FRs, FR-001 to FR-049+)
- Pipeline spec (unimplemented): `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010)
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (13 FRs, all passing)
- Route files with direct store access: `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts`
- eslint-disable suppressions: `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- Missing component tests: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`

### Common Pattern Violations

1. Direct store access from route handlers (recurring — 3 route files)
2. Specifications/ folder not updated when Plans/ supersede old specs
3. Unanchored FR-dependency-XXX IDs (no spec backing them)
