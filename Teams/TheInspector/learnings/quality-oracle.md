# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-15 — Grade D

### Spec Coverage Trend
- First audit; baseline established at **~27%** overall (3 specs in Specifications/)
- `workflow-engine.md` coverage: ~100% (solid, active implementation)
- `dev-workflow-platform.md` coverage: ~19% (dependency reqs only; 69 core FRs not started)
- `tiered-merge-pipeline.md` coverage: 0% (platform scope; may be out-of-band)

### Key File Paths (Fast Future Audits)
| What | Path |
|------|------|
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Enforcer requirements source | `Plans/self-judging-workflow/requirements.md` |
| Backend routes | `Source/Backend/src/routes/` (workItems, workflow, dashboard, intake) |
| Backend services | `Source/Backend/src/services/` (router, assessment, changeHistory, dependency) |
| Store (persistence) | `Source/Backend/src/store/workItemStore.ts` |
| Logger (canonical) | `Source/Backend/src/utils/logger.ts` |
| Logger (compat wrapper) | `Source/Backend/src/logger.ts` |
| Shared types | `Source/Shared/types/workflow.ts` |
| Frontend API client | `Source/Frontend/src/api/client.ts` |
| Backend test root | `Source/Backend/tests/` |
| Frontend test root | `Source/Frontend/tests/` |

### Common Pattern Violations Found
1. **Direct store calls in routes** (QO-001) — all 3 route files bypass service layer
2. **No OpenTelemetry** (QO-004) — logging+metrics present, tracing pillar absent
3. **eslint-disable without justification** (QO-008) — react-hooks/exhaustive-deps x2
4. **Logger not respecting NODE_ENV** (QO-006) — always JSON, no dev pretty-print
5. **Duplicate test files** (QO-007) — `tests/` and `tests/pages/` for same components

### Traceability Note
- Enforcer targets `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013 only)
- Main spec `Specifications/dev-workflow-platform.md` uses `FR-NNN` IDs (FR-001 to FR-069) — NOT checked by enforcer
- Dependency requirements use `FR-dependency-*` IDs — implemented in Source/ despite spec saying `portal/`
- `Verifies:` pattern in source uses format: `// Verifies: FR-WF-XXX` or `// Verifies: FR-dependency-XXXX`

### Known Open Issues (carry to next audit)
| ID | Issue | Status |
|----|-------|--------|
| QO-001 | Routes call store directly | OPEN |
| QO-002 | `/api/search` not registered, tests failing | OPEN |
| QO-003 | dev-workflow-platform.md FR-001–069 unimplemented | OPEN |
| QO-004 | OpenTelemetry absent | OPEN |
| QO-005 | Enforcer scope limited | OPEN |
| QO-006 | Logger no dev pretty-print | OPEN |
| QO-007 | Duplicate test files | OPEN |
| QO-008 | eslint-disable x2 no justification | OPEN |
| QO-009 | tiered-merge-pipeline.md unimplemented | OPEN |
| QO-010 | Two logger abstractions | OPEN |
