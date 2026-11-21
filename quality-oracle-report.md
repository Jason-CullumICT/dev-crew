## Quality Oracle Findings — 2026-11-21

**Grade: C** *(2 P1 + 4 P2 + 1 P3)*

---

### Spec Coverage

| Scope | FRs Defined | Traced | Coverage |
|---|---|---|---|
| Active plan (`self-judging-workflow`) | 13 | 13 | **100%** |
| All 8 plans (enforcer scan) | ~150 | ~13 | **~9%** |
| `Specifications/tiered-merge-pipeline.md` | 10 FR-TMP-* | 0 | **0%** |

> The ~9% is misleading — 7 of 8 plans describe an **older replaced system** (FeatureRequests/BugReports/DevCycles with SQLite, FR-001–FR-089). The current WorkItem engine (FR-WF-\*) is at 100% traceability. But the enforcer silently ignores 7 plans.

---

### QO-001 · P1 · `tools/traceability-enforcer.py`
**Traceability enforcer has single-plan scope — 7/8 plans silently pass the verification gate**

The CLAUDE.md gate `python3 tools/traceability-enforcer.py` auto-picks the most-recently-modified plan (`self-judging-workflow`), which passes. Run individually against all plans: **7/8 fail**. The gate gives a false green. Fix: add a `tools/traceability-enforcer-all.sh` wrapper that loops all `Plans/*/requirements.md` and fails on any miss.

---

### QO-002 · P1 · `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:44`, `intake.ts:19`
**Route handlers directly call the in-memory store — service layer bypassed**

Architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem`, `store.findById`, `store.updateWorkItem` etc. directly. The `services/` directory exists but only covers assessment, router, dependency, dashboard, and change history — not CRUD. Fix: create `services/workItemService.ts` and route all persistence through it.

---

### QO-003 · P2 · `Specifications/tiered-merge-pipeline.md`
**10 FR-TMP-* requirements in spec, zero implementation, no plan file**

Risk classification, E2E test generation, Playwright gate, auto-PR, AI review, auto-merge, post-merge Chrome validation — all specified, nothing coded. No `Plans/tiered-merge-pipeline/` exists. Either create a plan to track this as future work, or add a "Phase 2 — not yet planned" header so the enforcer can skip it.

---

### QO-004 · P2 · `Plans/` (7 directories)
**7 plans describe a replaced system — stale spec debt**

Plans for `dev-workflow-platform`, `orchestrated-dev-cycles`, `dev-cycle-traceability`, `orchestrator-cycle-dashboard`, `image-upload`, `dependency-linking`, `duplicate-deprecated-status` describe the old FeatureRequest/BugReport/Cycle/Ticket system (FR-001–FR-089, SQLite). That system was replaced by the current WorkItem engine. These should be archived to `Plans/_archived/` or explicitly marked superseded.

---

### QO-005 · P2 · Multiple plan files
**Placeholder `FR-XXX`, `FR-XXXX`, `FR-0XX` IDs never replaced — enforcer noise**

Several requirements files retain authoring placeholders as actual requirement IDs. A coder copying `// Verifies: FR-XXX` satisfies the enforcer for the wrong reason.

---

### QO-006 · P2 · `Source/Frontend/tests/`
**Duplicate test files for `WorkItemDetailPage` and `WorkItemListPage`**

`tests/WorkItemDetailPage.test.tsx` (368 lines) duplicates `tests/pages/WorkItemDetailPage.test.tsx` (393 lines); same for `WorkItemListPage`. Two authoritative test files for the same component create divergent mock setups and inflate coverage metrics.

---

### QO-007 · P3 · `Source/Frontend/src/hooks/useWorkItems.ts:63`, `DependencyPicker.tsx:82`
**ESLint suppressions mask potential stale-closure bugs**

Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments in production source violate the architecture rule against suppressing linting rules. This rule catches real stale-closure bugs.

---

**What's clean:** No `console.log` in production source (logger abstraction used correctly), no hardcoded secrets, active plan at 100% traceability, no skipped tests, no empty catch blocks.

Report saved to `Teams/TheInspector/findings/audit-2026-11-21-quality-oracle.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
