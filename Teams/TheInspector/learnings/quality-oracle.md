# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-07-17 — First full audit

### Project topology (critical context)

This repo has **two codebases** that are audited separately:

| Codebase | Location | Spec source | Enforcer scans? |
|---|---|---|---|
| Workflow Engine (self-judging-workflow) | `Source/` | `Plans/self-judging-workflow/requirements.md` | ✅ Yes |
| Dependency Linking | `Source/` | `Plans/dependency-linking/requirements.md` | ✅ Yes |
| Portal App (dev-workflow-platform) | `portal/` | `Specifications/dev-workflow-platform.md` | ❌ No |
| Tiered Merge Pipeline | `platform/orchestrator` | `Specifications/tiered-merge-pipeline.md` | ❌ No |

The traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, and only reads the most-recently-modified `Plans/*/requirements.md` file. It **never reads `Specifications/*.md`**.

### Enforcer behavior (critical)

- Default run: picks **most recently modified** `Plans/*/requirements.md` — currently `Plans/self-judging-workflow/requirements.md`
- Will PASS green even if `Specifications/tiered-merge-pipeline.md` is 100% unimplemented
- To audit a specific spec: `python3 tools/traceability-enforcer.py --file Specifications/xyz.md`
- `portal/` is NEVER scanned by the enforcer

### Spec coverage findings

- `Plans/self-judging-workflow/`: 13/13 FRs → 100% ✅
- `Plans/dependency-linking/`: 16/16 FR-dependency-* → 100% ✅
- `Specifications/dev-workflow-platform.md`: 0% in Source/ (correct — it's implemented in portal/)
- `Specifications/tiered-merge-pipeline.md`: 0% in Source/ (implemented in platform/orchestrator/)
- `Specifications/workflow-engine.md`: no FR-XXX IDs — untraceable by design gap

### Useful file paths for future audits

```
Source/Backend/src/routes/workItems.ts     — CRUD routes (direct store access — architecture gap)
Source/Backend/src/routes/workflow.ts      — Workflow actions (direct store access)
Source/Backend/src/routes/dashboard.ts     — Dashboard (clean — uses service layer only)
Source/Backend/src/services/dependency.ts  — Dependency BFS cycle detection
Source/Frontend/tests/pages/               — Comprehensive test versions (preferred)
Source/Frontend/tests/                     — ROOT: contains stale WorkItemDetailPage.test.tsx and WorkItemListPage.test.tsx
```

### Open findings from this audit

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| QO-001 | P1 | OPEN | Enforcer blind spot: Specifications/ never enforced |
| QO-002 | P2 | OPEN | Tiered merge pipeline spec untraced |
| QO-003 | P2 | OPEN | Duplicate stale root-level test files |
| QO-004 | P2 | OPEN | Route handlers bypass service layer |
| QO-005 | P3 | OPEN | eslint-disable without justification (2 instances) |
| QO-006 | P3 | OPEN | workflow-engine.md has no FR-XXX IDs |
| QO-007 | P3 | OPEN | portal/ app FRs not enforced against portal/ |

### Patterns confirmed clean

- No `console.log` in production source (logger abstraction working)
- No hardcoded secrets or credentials
- No `test.skip` / `xit` / `xdescribe`
- No empty catch blocks (all catch → log + HTTP error response)
- All list endpoints use `{data: T[]}` wrapper
- No files >500 lines in Source/ (largest: WorkItemDetailPage.tsx at 426 lines)
- 34 of 35 source files carry `// Verifies:` comments

### Spec trend

- First audit — no prior baseline to compare.
- Next audit: check if QO-003 (duplicate tests) was resolved by deletion of root-level files.
- Next audit: re-run `python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md` to check if platform/ comments were added.
