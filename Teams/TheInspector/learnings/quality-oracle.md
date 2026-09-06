# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-06 — Full Audit

### Spec Coverage Summary

| Plan | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| self-judging-workflow | 13 (FR-WF-001–013) | 13/13 | **100%** (enforcer verified) |
| dependency-linking (FR-dependency-*) | ~16 Source/-applicable | ~14/16 | **~88%** |
| tiered-merge-pipeline (FR-TMP-*) | 10 | 0/10 | **0%** (no requirements.md — not yet in scope) |
| dev-workflow-platform (FR-001–069) | 69 | 0 in Source/ | N/A (implemented in portal/) |

**Overall Source/ coverage (in-scope reqs): ~94%**

### Key Fast-Paths for Future Audits

- Traceability enforcer: `python3 tools/traceability-enforcer.py` — targets most-recently-modified `Plans/*/requirements.md`
- Config at: `Teams/TheInspector/inspector.config.yml`
- Source layout: `Source/Backend/` + `Source/Frontend/` + `Source/Shared/` (self-judging workflow engine)
- Portal layout: `portal/` — implements dev-workflow-platform spec (FR-001 to FR-069)
- Plans with requirements.md: `dependency-linking`, `dev-cycle-traceability`, `dev-workflow-platform`, `duplicate-deprecated-status`, `image-upload`, `orchestrated-dev-cycles`, `orchestrator-cycle-dashboard`, `self-judging-workflow`
- Tiered-merge-pipeline has NO requirements.md (design/QA/security reports only) — Phase 2

### Architecture-Mapping

| Spec | Implementation Location |
|------|------------------------|
| `Specifications/workflow-engine.md` | `Source/` (FR-WF-001 to FR-WF-013) |
| `Specifications/dev-workflow-platform.md` | `portal/` (FR-001 to FR-069) |
| `Specifications/tiered-merge-pipeline.md` | Unimplemented — Phase 2 |

### Common Violation Patterns Found

1. **False-positive traceability** — the enforcer counts test-file references as implementation coverage; `FR-dependency-search` passes the enforcer but the route is missing from `app.ts`
2. **Duplicate test files** — WorkItemDetailPage and WorkItemListPage each have two test files (`tests/` root and `tests/pages/`); `pages/` versions are authoritative/newer
3. **eslint-disable for react-hooks/exhaustive-deps** — appears in DependencyPicker.tsx and useWorkItems.ts
4. **Missing Prometheus histogram** — `dependencyCheckDuration` histogram required by FR-dependency-metrics is absent from `metrics.ts`
5. **Untested helper components** — Layout, PriorityBadge, StatusBadge, TypeBadge lack unit tests; DebugPortalPage is a stub with no test

### Prior P1/P2 Findings Status

| Finding | Status (2026-09-06) |
|---------|---------------------|
| QO-001: GET /api/search missing from app.ts | **OPEN — first identified** |
| QO-002: dependencyCheckDuration histogram absent | **OPEN — first identified** |
| QO-003: Duplicate test files (pages/ vs root) | **OPEN — first identified** |
| QO-004: eslint-disable in DependencyPicker + useWorkItems | **OPEN — first identified** |
