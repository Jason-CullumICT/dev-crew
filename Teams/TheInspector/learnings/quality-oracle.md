# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-13

### Spec Coverage Trend

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 69 | 0 | **0%** |
| `Specifications/dev-workflow-platform.md` (FR-dependency-*) | 15 | ~12 | **~80%** (but model mismatch — see QO-004) |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | **0%** |
| **Overall (all named FRs in Specifications/)** | **107** | **13** | **12.1%** |

The low overall coverage is not a code quality failure per se — it reflects that `dev-workflow-platform.md` describes an abandoned/future system, not the one implemented. The active implementation traces 100% of its own plan. **The headline risk is misleading specs, not missing code.**

### Common Patterns Found

1. **Spec files describe a different system than what is implemented.** `dev-workflow-platform.md` was written for a feature-request/bug-tracking system with SQLite. The codebase implements an in-memory work item workflow engine. Both can coexist as roadmap documents IF clearly labelled as "future" or "deprecated." Currently they are unlabelled.

2. **FR IDs reused across system contexts.** The `FR-dependency-*` IDs appear in `dev-workflow-platform.md` (portal/SQLite context) AND in source code (in-memory/WorkItem context). Same ID, different domain model — causes confusion during traceability audits.

3. **Traceability enforcer scoped too narrowly.** `tools/traceability-enforcer.py` covers only the most-recently-modified plan's `requirements.md`. It never reads `Specifications/` directory directly. Running it gives a green result even when 90%+ of spec requirements are untraced.

4. **GET /api/search not wired.** `Source/Backend/tests/routes/search.test.ts` self-documents that the route is missing. Frontend `DependencyPicker` calls this endpoint; the call will fail at runtime with 404. This is a P1 bug.

5. **Duplicate test files.** `WorkItemDetailPage` and `WorkItemListPage` each have two test files (`tests/` root AND `tests/pages/` subdirectory). No evidence of intentional split — likely test duplication from a copy.

6. **eslint-disable-next-line react-hooks/exhaustive-deps** in `useWorkItems.ts` and `DependencyPicker.tsx`. These silence potential stale-closure bugs.

### Useful File Paths for Future Audits

| File | Why Useful |
|------|------------|
| `Plans/self-judging-workflow/requirements.md` | Active plan requirements (FR-WF-001–013) |
| `Plans/dependency-linking/requirements.md` | Dependency plan requirements (FR-dependency-*) |
| `Specifications/dev-workflow-platform.md` | Legacy/roadmap spec — FR-001–FR-069 + FR-dependency-* |
| `Specifications/tiered-merge-pipeline.md` | Unimplemented pipeline spec — FR-TMP-001–010 |
| `Specifications/workflow-engine.md` | Narrative spec for implemented system (no FR IDs) |
| `Source/Backend/tests/routes/search.test.ts` | Documents known missing route with TODO |
| `tools/traceability-enforcer.py` | Enforcer — only scans Plans/, not Specifications/ |

### Re-verification Status

_First run — no prior P1/P2 findings to re-verify._
