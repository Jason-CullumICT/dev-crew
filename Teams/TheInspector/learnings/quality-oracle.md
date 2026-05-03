# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-03 — First Full Audit

### Project Structure (Fast Reference)

| Layer | Dir | Primary Spec | FR Namespace |
|-------|-----|-------------|-------------|
| Workflow Engine (in-memory) | `Source/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/` | `FR-WF-001..013` + `FR-dependency-*` |
| Dev Workflow Platform (SQLite) | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001..FR-089` + `FR-DUP-*` |
| Orchestrator Infrastructure | `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001..010` |

**Critical insight**: `Source/` and `portal/` are two separate applications. `inspector.config.yml` currently only scans `Source/`. Most spec gaps visible from the enforcer output are `portal/` gaps, not `Source/` gaps.

### Spec Coverage Trend

| Date | Source/-scoped | Cross-plan |
|------|----------------|-----------|
| 2026-05-03 | ~97% | ~60% |

The cross-plan 60% is structurally caused by `portal/` being out-of-scope for the enforcer — not actual missing implementations. Fix: add `portal/Backend/src/` and `portal/Frontend/src/` to `inspector.config.yml#source.dirs`.

### Traceability Enforcer Behaviour

- Default run (no `--file`) targets the **most recently modified** `Plans/*/requirements.md`. Currently that is `Plans/self-judging-workflow/requirements.md` which PASSES 100%. This is misleading — always also run with `--file` for open plans.
- The enforcer accepts any string matching `FR-[A-Z0-9-]+`, so placeholder IDs like `FR-XXX`, `FR-0XX`, `FR-XXXX` in template sections are counted as requirements. These are not real gaps — filter them when reporting.

### Open P1/P2 Findings from This Run

| ID | Finding | Status |
|----|---------|--------|
| QO-001 | `/api/search` route NOT wired in `Source/Backend/src/app.ts` | OPEN |
| QO-002 | `inspector.config.yml` excludes `portal/` — 50+ FRs invisible | OPEN |
| QO-003 | `POST /api/work-items/:id/dependencies` returns `DependencyLink` not `{data: WorkItem}` | OPEN |
| QO-004 | `pending_dependencies` status in contracts but absent from `WorkItemStatus` enum | OPEN |
| QO-005 | 7 plan files with unimplemented FRs (mostly portal/ scope) | OPEN |

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` used in production hooks without explanatory comments (`useWorkItems.ts:63`, `DependencyPicker.tsx:82`). Always flag these.

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Source app entry point | `Source/Backend/src/app.ts` |
| Shared types (Source) | `Source/Shared/types/workflow.ts` |
| API contracts doc | `Source/Shared/api-contracts.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| All plan requirements | `Plans/*/requirements.md` |
| Portal shared types | `portal/Shared/types.ts` |
| Portal backend index | `portal/Backend/src/index.ts` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Previous findings | `Teams/TheInspector/findings/audit-2026-05-03-B.md` |

### Architecture Rules to Spot-Check Every Run

1. No `console.log` in `Source/Backend/src/**` (use `logger`) ← passed this run
2. `// Verifies: FR-XXX` on all source files modified in last 14 days ← 3 violations in portal/
3. No empty catch blocks ← passed
4. All list endpoints return `{data: T[]}` ← passed
5. `/api/search` route existence in `app.ts` ← FAILING as of 2026-05-03
6. `WorkItemStatus` enum matches `api-contracts.md` state machine ← `pending_dependencies` missing
