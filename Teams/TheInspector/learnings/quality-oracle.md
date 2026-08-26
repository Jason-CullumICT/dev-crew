# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-08-26

### Spec Coverage Trend
- **15.1%** overall (13 of 86 total requirements traced to source)
- `Specifications/workflow-engine.md` (FR-WF-001..013): **100%** covered — every FR has `// Verifies: FR-WF-XXX` comments in Source/ and passes `python3 tools/traceability-enforcer.py`
- `Specifications/dev-workflow-platform.md` (FR-001..FR-069 + FR-dependency-seed): **0%** covered — completely unimplemented; different product domain (feature-request/bug/dev-cycle with SQLite vs. the in-memory workflow engine that's actually built)
- `Specifications/tiered-merge-pipeline.md` (NFR-1..NFR-3): **0%** covered — timing/pipeline NFRs, no implementation refs

### Grade: D
- 1 P1 finding (spec-drift: 70 unimplemented requirements)
- 2 P2 findings (enforcer misconfiguration, store-bypass architectural violation)
- Grading threshold C requires min 40% spec coverage — 15.1% falls below

---

## Key File Paths (for faster future audits)

| Purpose | Path |
|---------|------|
| Primary spec (UNIMPLEMENTED) | `Specifications/dev-workflow-platform.md` |
| Implemented spec | `Specifications/workflow-engine.md` |
| Plan requirements (enforcer target) | `Plans/self-judging-workflow/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Shared types | `Source/Shared/types/workflow.ts` |
| Store layer (accessed directly by routes) | `Source/Backend/src/store/workItemStore.ts` |
| Route violators (direct store access) | `Source/Backend/src/routes/workItems.ts`, `intake.ts`, `workflow.ts` |
| Silent catch | `Source/Frontend/src/api/client.ts:26` |
| eslint-disable | `Source/Frontend/src/hooks/useWorkItems.ts:63` |

---

## Common Pattern Violations Found

1. **Route handlers bypass the service layer** — `workItems.ts`, `intake.ts`, `workflow.ts` all `import * as store from '../store/workItemStore'` and call it directly. Services exist for specialized ops (assessment, dependency, dashboard, router) but not for core CRUD.

2. **Traceability IDs are non-uniform** — three distinct ID namespaces in use:
   - `FR-WF-XXX` (workflow engine FRs — the correct ones)
   - `FR-dependency-XXX` (dependency feature FRs — ad-hoc)
   - `FR-XXX` (dev-workflow-platform spec — not referenced in Source/ at all)

3. **metrics.test.ts uses `FR-dependency-metrics` not `FR-WF-013`** — the Prometheus metrics test is mis-tagged; FR-WF-013 coverage exists only in src/ not tests/.

4. **Silent catch in api/client.ts** — `response.json().catch(() => ({}))` has no comment explaining the intentional suppression.

---

## Useful Audit Commands

```bash
# Run the enforcer (only checks Plans/ requirements, not Specifications/)
python3 tools/traceability-enforcer.py

# Find all Verifies IDs in source
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -oP "FR-[A-Z-]*\d+" | sort -u

# Extract FR IDs from specs
grep -rn "FR-[0-9]\+" Specifications/dev-workflow-platform.md | grep -oP "FR-\d+" | sort -u

# Find recently modified source files
git log --since="14 days ago" --name-only --pretty=format: | grep "^Source/" | sort -u
```
