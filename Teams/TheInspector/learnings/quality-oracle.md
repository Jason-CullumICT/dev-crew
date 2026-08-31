# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-31 — Full Audit

### Spec Coverage Trend

| Reference | FRs Defined | FRs Traced to Source | Coverage |
|-----------|-------------|---------------------|----------|
| `Specifications/dev-workflow-platform.md` | 77 (FR-001 to FR-069+) | **0** | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001 to FR-TMP-010) | 0 | 0% |
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001 to FR-WF-013) | 13 | 100% |
| `Plans/dependency-linking/requirements.md` | 15 (FR-dependency-*) | ~15 | ~100% (not enforced) |

**Key Insight**: The `Specifications/` folder (canonical domain truth per CLAUDE.md) and the `Plans/` folder (implementation FRs) are on completely different ID namespaces. The traceability-enforcer only checks Plans/. The Specifications/ FRs are never validated.

### FR ID Namespaces (CRITICAL TO KNOW)

Three distinct FR namespaces coexist in the codebase:

| Namespace | Where Defined | Where Used | Enforced? |
|-----------|---------------|------------|-----------|
| `FR-NNN` (FR-001 to FR-069) | `Specifications/dev-workflow-platform.md` | Nowhere in Source/ | ❌ Never |
| `FR-TMP-NNN` | `Specifications/tiered-merge-pipeline.md` | Nowhere in Source/ | ❌ Never |
| `FR-WF-NNN` | `Plans/self-judging-workflow/requirements.md` | Backend+Frontend src+tests | ✅ Yes (enforcer auto-picks most recent) |
| `FR-dependency-*` | `Plans/dependency-linking/requirements.md` | Backend+Frontend tests | ⚠️ Only when it's the most recently modified plan |

### Key File Paths for Fast Future Audits

- Traceability enforcer: `tools/traceability-enforcer.py` — auto-picks most recent `Plans/*/requirements.md`
- Self-judging workflow requirements: `Plans/self-judging-workflow/requirements.md`
- Dependency-linking requirements: `Plans/dependency-linking/requirements.md`
- Main platform spec (FR-001 to FR-069): `Specifications/dev-workflow-platform.md`
- Workflow engine domain spec (no FR IDs): `Specifications/workflow-engine.md`
- Source directly calls store from routes: `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`

### Architectural Observations

1. **No service layer for CRUD** — `workItems.ts` and `workflow.ts` routes call `workItemStore` directly. Services exist for business logic (assessment, router, dependency, changeHistory, dashboard) but not for basic CRUD. This violates the "No direct DB calls from route handlers" rule.

2. **Catch blocks in workflow.ts are all properly logged** — all 7 catch blocks call `logger.error` with context. No silent swallows.

3. **Only silent error swallow found**: `api/client.ts:26` — `.catch(() => ({}))` when parsing failed HTTP response body.

4. **FR-WF-013 observability requirement** — has source Verifies comments but zero test coverage. The `metrics.test.ts` only covers `FR-dependency-metrics`, not `FR-WF-013`.

5. **Untested frontend components**: Layout, PriorityBadge, StatusBadge, TypeBadge — no test files.

6. **eslint-disable** usage: 2 production files suppress `react-hooks/exhaustive-deps` — potential stale closure bugs.

### Common Pattern Violations Found

- Direct store import in route handlers (should go through a service)
- FR namespace fragmentation: 3 namespaces, only 1 enforced at a time
- Specs (Specifications/) and Plans (Plans/) serve different purposes but CLAUDE.md frames Specifications/ as "the most critical documents" — yet the enforcer ignores them
