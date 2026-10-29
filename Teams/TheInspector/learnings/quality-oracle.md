# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-10-29

### Spec Coverage Trend

**First audit — baseline established.**

| Spec File | Requirements | Traced in Source/ | Coverage |
|-----------|-------------|-------------------|----------|
| `Specifications/workflow-engine.md` (via Plans/self-judging-workflow/requirements.md) | 13 FR-WF-* | 13/13 | **100%** |
| `Specifications/dev-workflow-platform.md` | FR-001..069 | 0/69 | 0% (portal/ app, not Source/) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001..010 | 0/10 | **0% — UNIMPLEMENTED** |
| `Plans/dependency-linking/requirements.md` | 16 FR-dependency-* | 16/16 | 100% |

- `Specifications/dev-workflow-platform.md` is intentionally implemented in `portal/`, not `Source/` — not a gap.
- `Specifications/tiered-merge-pipeline.md` is ORPHANED — no Plan requirements file, no source references.

### Common Pattern Violations Found

1. **`pending_dependencies` status drift** — `Source/Shared/api-contracts.md` documents this status but it's never added to `WorkItemStatus` enum. Both `BlockedBadge` and dispatch gating are spec-incomplete as a result.
2. **Missing `dependencyCheckDuration` histogram** — Only 3 of 4 specified FR-dependency-metrics are implemented in `Source/Backend/src/metrics.ts`. The histogram is absent.
3. **Traceability enforcer selects only most-recent plan** — With multiple plans active simultaneously, only one is checked per run. Use `--file` or `--plan` flags explicitly.
4. **No OpenTelemetry in Source/Backend** — CLAUDE.md mandates OTel but Source/Backend has no `@opentelemetry` packages. The per-plan spec (FR-WF-013) doesn't require OTel, creating architecture-rule/spec tension.

### Useful File Paths for Future Audits

- Shared types: `Source/Shared/types/workflow.ts`
- API contracts doc: `Source/Shared/api-contracts.md`
- Metrics: `Source/Backend/src/metrics.ts`
- Dependency service: `Source/Backend/src/services/dependency.ts`
- Workflow routes (dispatch gating): `Source/Backend/src/routes/workflow.ts`
- BlockedBadge: `Source/Frontend/src/components/BlockedBadge.tsx`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Dependency-linking requirements: `Plans/dependency-linking/requirements.md`

### Duplicate Test Files

`Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` are duplicated by `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx`. Both sets appear active. Resolve ambiguity.
