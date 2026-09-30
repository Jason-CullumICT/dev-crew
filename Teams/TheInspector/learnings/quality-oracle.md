# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-30

### Spec Coverage Summary

| Spec | Requirements | Implemented | Coverage |
|------|-------------|-------------|----------|
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 69 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | ~11 | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | 13 | **100%** |
| FR-dependency-* (inline in dev-workflow-platform.md) | 15 | 15 | **100%** |

**Key finding**: The `Source/` directory implements the Self-Judging Workflow Engine (FR-WF-*), NOT the primary `dev-workflow-platform.md` specification. This is a total spec-implementation mismatch on the primary spec.

### Traceability Enforcer Behavior
- `python3 tools/traceability-enforcer.py` targets **most recently modified** `Plans/*/requirements.md` by default
- It currently targets `Plans/self-judging-workflow/requirements.md` (FR-WF-*) and passes 13/13
- It does NOT validate `Specifications/dev-workflow-platform.md` FR-001–FR-069
- This produces a **false-positive pass signal** for the primary spec

### Useful File Paths
- Traceability enforcer: `tools/traceability-enforcer.py`
- Primary spec: `Specifications/dev-workflow-platform.md`
- Active requirements (what code covers): `Plans/self-judging-workflow/requirements.md`
- Inspector config: `Teams/TheInspector/inspector.config.yml`

### Pattern Violations Found
1. `Source/Frontend/src/components/DependencyPicker.tsx:82` — `eslint-disable-next-line react-hooks/exhaustive-deps`
2. `Source/Frontend/src/hooks/useWorkItems.ts:63` — `eslint-disable-next-line react-hooks/exhaustive-deps`

### Trend
- First audit: spec coverage 0% for primary spec (dev-workflow-platform.md)
- Workflow-engine and dependency specs: fully covered (100%)
- No console.log violations in production source
- No hardcoded secrets
- No swallowed errors (catch blocks properly log + respond)
- No skipped tests found
