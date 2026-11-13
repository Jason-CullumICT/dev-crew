# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-13

### Spec Coverage Trend
- First audit run; baseline established.
- Active plan (self-judging-workflow + dependency-linking FRs): **~100%** coverage ✓
- Cross-plan + Specifications/ coverage: **~22%** (enforcer gap)

### Architecture Snapshot
- **Product in `Source/`:** Self-Judging Workflow Engine — in-memory store, work items, assessments, dependency linking
- **Matching specs:** `Specifications/workflow-engine.md` (narrative) + `Plans/self-judging-workflow/` + `Plans/dependency-linking/`
- **Orphan specs:** `Specifications/dev-workflow-platform.md` (77 FRs for a *different* SQLite-backed feature-request product — appears superseded but not marked so)

### Common Pattern Violations Found
1. **Direct store imports in routes** — workflow.ts, intake.ts, workItems.ts bypass service layer
2. **Silent error swallow** — `api/client.ts:26` `.catch(() => ({}))`
3. **eslint-disable in hooks** — 2 occurrences in useWorkItems.ts and DependencyPicker.tsx

### Enforcer Bugs
- The `traceability-enforcer.py` extracts ALL `FR-[A-Z0-9-]+` matches from requirements files, including prose descriptions and data-example IDs. This causes false positives for `Plans/dependency-linking/` (FR-0002..FR-0007 are seed data item IDs, not requirement IDs). Fix: restrict extraction to first column of Markdown tables.
- Enforcer defaults to most-recently-modified plan. Run `--file` explicitly for each plan to see real coverage.

### Key File Paths for Future Audits
| File | Why It Matters |
|------|----------------|
| `tools/traceability-enforcer.py` | Runs all traceability checks; has scope + regex bugs |
| `Plans/*/requirements.md` | Requirement source files; 8 plans, only 1 auto-checked |
| `Specifications/dev-workflow-platform.md` | 77 FRs — appears superseded; needs status classification |
| `Source/Backend/src/routes/workflow.ts` | Architecture violation: direct store import |
| `Source/Backend/src/routes/intake.ts` | Architecture violation: direct store import |
| `Source/Backend/src/routes/workItems.ts` | Architecture violation: direct store import |
| `Source/Frontend/src/api/client.ts:26` | Silent error swallow in .catch() |

### No Issues Found In
- `console.log` / `console.error` usage (logger abstraction used throughout)
- Hardcoded secrets or credentials
- API response wrapper compliance (`{data: T[]}` patterns correct)
- Files over 500 lines (largest: WorkItemDetailPage.tsx at 426 lines)
- TODO/FIXME comments with stale dates (none found)
- Empty catch blocks (backend is clean; only frontend api/client has the one silent catch)

### Open P1/P2 Findings for Re-Verification Next Run
| ID | File | Description |
|----|------|-------------|
| QO-001 | `tools/traceability-enforcer.py` | Enforcer single-plan default — verify if `--all` mode added |
| QO-002 | `Specifications/dev-workflow-platform.md` | Specs not classified/enforced — verify if status field added |
| QO-003 | `Source/Backend/src/routes/workflow.ts` | Direct store import — verify if service layer extracted |
| QO-004 | `Source/Frontend/src/api/client.ts:26` | Silent catch — verify if re-throw or comment added |
| QO-005 | `tools/traceability-enforcer.py` | False-positive extraction — verify if regex narrowed |
