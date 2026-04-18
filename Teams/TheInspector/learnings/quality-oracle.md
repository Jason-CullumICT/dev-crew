# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-04-18

### Spec Coverage Trend
- **First audit baseline established.** Coverage against canonical `Specifications/` is ~0% (product mismatch — specs describe a different application than what is built).
- Coverage against active `Plans/self-judging-workflow/` requirements: **100%** (enforcer passes cleanly).
- Coverage against `Plans/dependency-linking/` FR-dependency-* IDs: **~88%** (2 open items: FR-dependency-api-types, FR-dependency-seed; FR-dependency-frontend-tests is actually DONE despite delta saying otherwise).

### Critical Discovery: Two-Product Bifurcation
The `Specifications/` folder describes a **Feature Request / Bug Report / Dev Cycles** platform (FR-001–FR-069, SQLite, voting, approvals). The actual `Source/` implements a **Self-Judging Workflow Engine** (WorkItems, in-memory store, router, assessment pod). These are entirely different products. Future audits must treat `Specifications/` as aspirational until reconciled.

### Traceability Enforcer Limitation
`tools/traceability-enforcer.py` without flags auto-selects the **most recently modified** `requirements.md` in `Plans/`. This silently masks 4 plans with 57 unimplemented requirements. Always run with `--plan` for specific plans, or verify all plans. The enforcer's regex pattern `FR-\\d+` in inspector.config.yml misses `FR-WF-XXX` and `FR-dependency-XXX` identifiers.

### FR Namespace Map (discovered)
| Prefix | Owning Document | Status |
|--------|----------------|--------|
| `FR-WF-XXX` | `Plans/self-judging-workflow/requirements.md` | ACTIVE — 100% implemented |
| `FR-dependency-XXX` | `Plans/dependency-linking/requirements.md` | ACTIVE — ~88% implemented |
| `FR-NNN` (001–032) | `Specifications/dev-workflow-platform.md` | NOT BUILT |
| `FR-NNN` (033–049) | `Plans/orchestrated-dev-cycles/requirements.md` | NOT BUILT |
| `FR-NNN` (050–069) | `Plans/dev-cycle-traceability/requirements.md` | NOT BUILT |
| `FR-NNN` (070–089) | `Plans/image-upload/requirements.md` | NOT BUILT |
| `FR-TMP-XXX` | `Specifications/tiered-merge-pipeline.md` | NOT BUILT |

### Architecture Rule Status
- ✅ **No console.log in production** — clean
- ✅ **No hardcoded secrets** — clean
- ✅ **Shared types used correctly** — both Backend and Frontend import from `Source/Shared/types/workflow.ts`
- ✅ **No inline type re-definitions** — clean
- ✅ **No skipped tests** — clean
- ⚠️ **Service layer bypass** — 3 route handlers (`workItems.ts`, `workflow.ts`, `intake.ts`) import `workItemStore` directly (P2 QO-003)
- ⚠️ **eslint-disable without docs** — 2 instances (P3 QO-006)

### Useful File Paths for Future Audits
- Active requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Shared types (single source of truth): `Source/Shared/types/workflow.ts`
- Enforcer tool: `tools/traceability-enforcer.py`
- Backend store (bypassed by routes): `Source/Backend/src/store/workItemStore.ts`
- Duplicate test locations: `Source/Frontend/tests/` (top-level) vs `Source/Frontend/tests/pages/` (subdirectory)

### Common Pattern Violations Found
1. Route handlers importing store directly instead of through services (3 files)
2. `react-hooks/exhaustive-deps` suppression without justification (2 files)
3. Duplicate test files for the same component at two different paths

### Open Items Carried Forward
- `FR-dependency-api-types`: `blocked_by?: string[]` missing from `UpdateWorkItemRequest` in `Source/Shared/types/workflow.ts`
- `FR-dependency-seed`: No seed data file exists in `Source/Backend/src/`
- `Plans/dependency-linking/requirements.md` implementation delta references stale `portal/` paths — needs update to `Source/`
