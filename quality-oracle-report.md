---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec | Requirements | Coverage |
|------|-------------|----------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | **100%** ✅ |
| `dev-workflow-platform.md` (FR-001–069) | 69 | **Enforcer cannot measure** ⛔ |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | **90%** (1 missing) |
| `FR-dependency-*` (16 requirements) | 16 | **94%** (seed missing) |

---

### QO-001: Traceability Enforcer Blind to `portal/` — Verification Gate Is Broken
- **Severity:** P1
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:69-83`
- **Detail:** `tools/traceability-enforcer.py` hardcodes scan dirs as `["Source", "E2E"]`. The project has **two product codebases**: `Source/` (workflow-engine.md) and `portal/` (dev-workflow-platform.md). When the enforcer is run against `Plans/dev-workflow-platform/requirements.md` it reports **34 false failures** — every FR-001 through FR-069 looks "unimplemented" even though all are traced in `portal/Backend/src/routes/` and `portal/Frontend/`. Similarly, `Plans/dependency-linking/requirements.md` falsely reports 7 failures. **The CLAUDE.md-mandated verification gate cannot validate the portal/ implementation at all.**
- **Recommendation:** Extend the enforcer's scan dirs to include `portal/` and `platform/`. Either make `source_dirs` configurable via `inspector.config.yml` (already has `source.dirs: ["Source/"]`) or pass all dirs from config. The inspector config already has the right layout — the enforcer just ignores it.
- **Cross-ref:** This breaks the testing rules section of CLAUDE.md: *"Verification gates: python3 tools/traceability-enforcer.py"*.

---

### QO-002: FR-dependency-seed Has No Implementation Anywhere
- **Severity:** P2
- **Category:** spec-drift (unimplemented requirement)
- **File:** `portal/Backend/src/database/` (missing: `seed.ts`)
- **Detail:** FR-dependency-seed specifies: *"Idempotent seed data: BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003; called on server startup if seed items exist."* No `seed.ts` exists in `portal/Backend/src/database/`. `portal/Backend/src/index.ts` has no seed call. `GET /api/bugs/BUG-0010` therefore returns no `blocked_by` array on a fresh setup, making dependency examples non-demonstrable. The `dependencies` table schema is present and correct — only the seed data function is missing.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with an idempotent seed function (check-before-insert), call it from `index.ts` after schema init. Add `// Verifies: FR-dependency-seed` comment.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: FR-TMP-008 Missing Traceability Comment in Dockerfile.worker
- **Severity:** P2
- **Category:** untested (no traceability link)
- **File:** `platform/Dockerfile.worker:31-40`
- **Detail:** FR-TMP-008 specifies that `gh` CLI and Playwright must be installed in the worker Docker image. Both are implemented correctly (lines 31-32 install `gh`, lines 39-40 install Playwright+Chromium). However, `grep -rn "Verifies.*FR-TMP-008"` returns 0 results across the entire repo. Every other FR-TMP-* has at least one Verifies reference — FR-TMP-008 is the only orphan. The verification gate cannot confirm this requirement is covered.
- **Recommendation:** Add `# Verifies: FR-TMP-008` comment block in `platform/Dockerfile.worker` adjacent to the `gh` and `playwright` install steps.

---

### QO-004: FR-dependency-* ID Namespace Collision Between Source/ and portal/
- **Severity:** P2
- **Category:** architecture-violation (traceability ambiguity)
- **File:** `Source/Backend/src/services/dependency.ts` vs `portal/Backend/src/services/dependencyService.ts`
- **Detail:** Both codebases use identical `FR-dependency-*` requirement IDs in their `// Verifies:` comments, but they implement completely different domain models:
  - `Source/` uses FR-dependency-* for its **in-memory WorkItem** dependency service (WI-XXX format, no DB)
  - `portal/` uses FR-dependency-* for its **SQLite BugReport/FeatureRequest** dependency service (BUG-XXXX/FR-XXXX format, SQLite)
  The canonical spec (`Plans/dependency-linking/requirements.md`) explicitly references portal/ paths (`portal/Shared/types.ts`, `portal/Backend/src/database/schema.ts`). Source/'s use of these IDs is incorrect — the in-memory WorkItem dependency feature should reference FR-WF-* IDs instead. This makes traceability reports ambiguous: "FR-dependency-service is implemented" is true for both but means different things.
- **Recommendation:** Assign new FR-WF-DEP-* IDs in `Plans/self-judging-workflow/requirements.md` for the Source/ in-memory dependency feature, and update Verifies comments in `Source/Backend/src/services/dependency.ts`, `Source/Backend/src/routes/workflow.ts`, and associated test files.
- **Cross-ref:** [ESCALATE → TheFixer] for comment updates.

---

### QO-005: eslint-disable Suppressions in Production Hook Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` lint rule. This rule catches stale closure bugs — suppressing it without explicit justification risks effects that don't re-run when expected. `useWorkItems.ts` has the suppression in a `useEffect` with a dependency array that may be intentionally omitted (fetch-on-mount), but no comment explains the intent. `DependencyPicker.tsx` suppresses it for a debounce effect.
- **Recommendation:** Add inline comments explaining why each suppression is safe (e.g., `// intentional: fetch-on-mount only`). Better: refactor to eliminate the suppression using `useCallback` or `useRef` for stable callbacks.

---

### QO-006: playwright.pipeline.config.ts Recently Modified — No Traceability
- **Severity:** P3
- **Category:** untested (unlinked implementation)
- **File:** `Source/E2E/playwright.pipeline.config.ts`
- **Detail:** Modified within the last 14 days (part of the tiered-merge-pipeline feature). FR-TMP-002 and FR-TMP-003 specify E2E test generation and the pipeline Playwright runner. This config file supports the pipeline config written by the orchestrator but carries no `// Verifies: FR-TMP-*` comment linking it to any requirement.
- **Recommendation:** Add `// Verifies: FR-TMP-003 — Pipeline Playwright config for cycle-scoped E2E runs` to line 1.

---

### Architecture Rule Compliance (All Passing ✅)

| Rule | Status |
|------|--------|
| No `console.log` in production | ✅ Clean (0 violations) |
| No hardcoded secrets | ✅ Clean |
| No swallowed catch blocks | ✅ All catch blocks log + respond |
| Service layer between routes and DB/store | ✅ Enforced in both Source/ and portal/ |
| No `test.skip` / `test.todo` | ✅ Clean |
| No files > 500 lines | ✅ Largest: WorkItemDetailPage.tsx (426 lines) |
| Shared types from Shared/ (no inline re-defs) | ✅ Both Source/ and portal/ use their own Shared/ |
| All list endpoints `{data: T[]}` | ✅ Verified in Source/ routes |
| Structured logging (not console.log) | ✅ pino/logger abstraction throughout |

---

### JSON Summary

```json
{
  "audit_date": "2026-06-08",
  "grade": "B",
  "spec_coverage": {
    "workflow_engine": { "total": 13, "traced": 13, "pct": 100 },
    "dev_workflow_platform": { "total": 69, "traced": "unverifiable", "note": "enforcer blind to portal/" },
    "tiered_merge_pipeline": { "total": 10, "traced": 9, "pct": 90 },
    "dependency_linking": { "total": 16, "traced": 15, "pct": 94 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer cannot scan portal/ or platform/" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed: no seed.ts in portal/Backend" },
    { "id": "QO-003", "severity": "P2", "category": "untested", "title": "FR-TMP-008 has no Verifies comment in Dockerfile.worker" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "FR-dependency-* IDs used by both Source/ and portal/ — namespace collision" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable suppressions in production frontend hooks" },
    { "id": "QO-006", "severity": "P3", "category": "untested", "title": "playwright.pipeline.config.ts recently modified with no Verifies comment" }
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 2,
  "p4_count": 0,
  "architecture_rules_passing": true
}
```

---

**Grade: B** — 1 P1 (gate integrity), 3 P2s, 2 P3s. The P1 is systemic but doesn't indicate broken code — the Source/workflow-engine implementation is fully traced and well-structured. The critical gap is that half the codebase (`portal/`, `platform/`) is invisible to the mandatory verification gate.
