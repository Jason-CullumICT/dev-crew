---

## Quality Oracle Findings

### Spec Coverage: **24.8%** — Grade D
| Source | FR Format | Total | Traced to Source/ |
|--------|-----------|-------|-------------------|
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001…013 | 13 | ✅ 13 (100%) |
| `Specifications/dev-workflow-platform.md` | FR-dependency-* | 16 | ✅ 15 (94%) |
| `Specifications/dev-workflow-platform.md` | FR-001…069 | 74 | ❌ 0 (0%) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001…010 | 10 | ❌ 0 (0%) |
| **Total** | | **113** | **28 (24.8%)** |

---

### QO-001: Traceability Enforcer Has a 91% Blind Spot
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-discovers `Plans/*/requirements.md` (most recently modified file). It currently scans only `Plans/self-judging-workflow/requirements.md` — 13 FR-WF IDs. It **never reads `Specifications/` directly**, leaving 100 of 113 total requirements (FR-001..069, all FR-TMP-*, and FR-dependency-*) completely unaudited. `python3 tools/traceability-enforcer.py` exits `PASSED` even though 74 platform FRs and 10 pipeline FRs have zero implementation.
- **Recommendation:** Either (a) add a `Specifications/` sweep to the enforcer so it extracts all FR-XXX IDs from spec files and cross-references them, or (b) create `Plans/dev-workflow-platform/requirements.md` and `Plans/tiered-merge-pipeline/requirements.md` mirror files so the enforcer can target them.
- **Cross-ref:** TheFixer — enforcer tool change is in `tools/` (solo-session scope)

---

### QO-002: 74 FR-XXX Platform Requirements — Zero Implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:341`
- **Detail:** `dev-workflow-platform.md` specifies FR-001 through FR-069 covering FeatureRequests, BugReports, development cycles, pipeline stages, OpenTelemetry tracing, React pages (FR-022..030), and more. None of these exist in `Source/`. `Source/` implements a *different* system (self-judging workflow engine). These specs have **never been implemented** — no git history touches these FRs in `Source/`.
- **Recommendation:** Clarify whether `dev-workflow-platform.md` is the spec for the `portal/` app (separate directory) or a future phase. If it's `portal/`, annotate the spec header. If it's a future `Source/` phase, create a plan in `Plans/` so the enforcer can track it. If it's abandoned, archive it.
- **Cross-ref:** requirements-reviewer owns `Specifications/`

---

### QO-003: 10 FR-TMP Pipeline Requirements — Zero Implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** FR-TMP-001 through FR-TMP-010 (risk classification, Playwright E2E generation, auto-PR, AI PR review, auto-merge logic, error handling) have zero `// Verifies:` references anywhere in `Source/`. The tiered-merge-pipeline appears to target orchestrator logic in `platform/` (not `Source/`), but no implementation exists there either per the search results.
- **Recommendation:** Determine whether this is a `platform/` feature (solo-session) or an in-flight spec. If planned, create `Plans/tiered-merge-pipeline/requirements.md` to make it trackable.
- **Cross-ref:** solo-session owns `platform/`

---

### QO-004: Route Handlers Bypass Service Layer — Architecture Violation
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `routes/workflow.ts:15`, `routes/intake.ts:4`
- **Detail:** All three route files directly import from `store/workItemStore`:
  ```ts
  import * as store from '../store/workItemStore';
  ```
  and call store operations (`store.createWorkItem`, `store.findAll`, `store.softDelete`, `store.updateWorkItem`) inline in route handlers. CLAUDE.md rule: **"No direct DB calls from route handlers — use the service layer."** Services exist (`services/changeHistory.ts`, `services/router.ts`, `services/dependency.ts`, `services/assessment.ts`) but no general `workItemService.ts` encapsulates the CRUD.
- **Recommendation:** Extract a `services/workItemService.ts` that wraps store calls. Route handlers should call service functions only.
- **Cross-ref:** TheFixer → backend-coder

---

### QO-005: `FR-dependency-seed` Not Implemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:475`
- **Detail:** `FR-dependency-seed` requires idempotent seed data establishing known dependency chains (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; etc.). No seed script or seeder exists in `Source/Backend/`. This is the only FR-dependency-* requirement with zero coverage.
- **Recommendation:** Add a seed script at `Source/Backend/src/seeds/dependencies.ts` or in app startup, gated by `NODE_ENV=development`.
- **Cross-ref:** TheFixer → backend-coder

---

### QO-006: ESLint `react-hooks/exhaustive-deps` Suppressed in Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress a rule that catches stale closures — a common source of bugs in React hooks. Suppressing it without explanation risks future regressions when the dependency array diverges from the hook's actual reads.
- **Recommendation:** Either refactor the effect to declare all dependencies correctly (use `useCallback`/`useMemo` to stabilize references), or add an inline comment documenting **why** the suppression is safe.
- **Cross-ref:** TheFixer → frontend-coder

---

### JSON Summary

```json
{
  "audit_date": "2026-09-28",
  "spec_coverage_pct": 24.8,
  "total_spec_requirements": 113,
  "traced_requirements": 28,
  "grade": "D",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift",           "title": "Traceability enforcer has 91% blind spot — only checks 13 of 113 FRs" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift",           "title": "74 FR-XXX platform requirements have zero implementation in Source/" },
    { "id": "QO-003", "severity": "P1", "category": "spec-drift",           "title": "10 FR-TMP pipeline requirements have zero implementation" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","title": "3 route handlers import store directly — bypasses service layer" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift",           "title": "FR-dependency-seed not implemented — no seed data in Source/" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation",    "title": "2 eslint-disable-next-line react-hooks/exhaustive-deps in production code" }
  ],
  "passed_checks": [
    "No console.log in production source",
    "No empty catch blocks",
    "No hardcoded secrets detected",
    "No skipped/todo tests",
    "All 13 FR-WF requirements fully traced (enforcer PASSED)",
    "All 15 of 16 FR-dependency-* requirements traced",
    "Structured logging abstraction used correctly (never console.log)"
  ]
}
```

---

**Learnings updated** at `Teams/TheInspector/learnings/quality-oracle.md`.
