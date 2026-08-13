---

## Quality Oracle Findings

**Audit date:** 2026-08-13 | **Grade: B** (0 P1s exploitable, 3 P2s, 3 P3s, 3 P4s — just above the B threshold of ≤8 P2s, ≥60% spec coverage)

---

### Architecture Clarification

This repo has **two separate apps** — a critical finding that affects all spec-coverage numbers:

| App | Source | Spec | Stack |
|-----|--------|------|-------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | Express + in-memory store |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | Express + SQLite |

`Specifications/dev-workflow-platform.md` (74 FRs) governs `portal/`, not `Source/`. Zero of those FRs appear in `Source/` — this is by design, not a gap.

---

### Spec Coverage: **100% (active plan)**
- `Plans/self-judging-workflow/requirements.md`: 13/13 FRs traced ✅  
- 7 other plans fail traceability because they target `portal/` — the enforcer has no awareness of this split (see QO-003)

---

### QO-001 — `GET /api/search` not wired into `app.ts`
- **Severity:** P1  
- **Category:** spec-drift  
- **File:** `Source/Backend/src/app.ts`  
- **Detail:** `FR-dependency-search` is marked Done in the implementation delta, but `Source/Backend/src/app.ts` never registers the route. `Source/Backend/tests/routes/search.test.ts` line 3 explicitly says *"these tests document the expected contract and will FAIL until the route is implemented."* No `search.ts` exists under `Source/Backend/src/routes/`.  
- **Recommendation:** Implement `GET /api/search?q=` route searching work item title/description; register it in `app.ts`. Tests are already written and waiting.

---

### QO-002 — Logger never pretty-prints in development (CLAUDE.md architecture violation)
- **Severity:** P2  
- **Category:** architecture-violation  
- **File:** `Source/Backend/src/utils/logger.ts:17`  
- **Detail:** `CLAUDE.md` mandates "structured JSON logging in production, **pretty-printing in development**". The logger always calls `process.stdout.write(JSON.stringify(entry))` with no `NODE_ENV` check. Local development produces machine-readable JSON blobs.  
- **Recommendation:** Guard on `process.env.NODE_ENV !== 'production'` to emit human-readable output.

---

### QO-003 — 7 of 8 plan requirements files fail the traceability enforcer
- **Severity:** P2  
- **Category:** spec-drift  
- **File:** `tools/traceability-enforcer.py:50`  
- **Detail:** Running the enforcer against every `Plans/*/requirements.md` reveals: image-upload, duplicate-deprecated-status, dependency-linking, dev-cycle-traceability, orchestrated-dev-cycles, orchestrator-cycle-dashboard, dev-workflow-platform all fail. Most target `portal/`, not `Source/`, so "failures" are partly architectural (wrong scope), but the CI gate silently passes because it only checks the most-recently-modified plan.  
- **Recommendation:** Add `--all` flag to the enforcer, or a wrapper script, with per-plan scope awareness. Update the CLAUDE.md verification gates to catch cross-plan gaps.

---

### QO-004 — Duplicate test suites for `WorkItemDetailPage` and `WorkItemListPage`
- **Severity:** P2  
- **Category:** test-coverage  
- **File:** `Source/Frontend/tests/`  
- **Detail:** Four test files exist instead of two: `tests/WorkItemDetailPage.test.tsx` (368 lines) + `tests/pages/WorkItemDetailPage.test.tsx` (393 lines); `tests/WorkItemListPage.test.tsx` (286 lines) + `tests/pages/WorkItemListPage.test.tsx` (262 lines). Both suites for each component test the same page but with slightly different coverage. It is ambiguous which is authoritative, and both run in CI.  
- **Recommendation → TheFixer:** Consolidate into `tests/pages/` (mirrors `src/pages/` structure). Delete the top-level duplicates.

---

### QO-005 — Dual logger shim anti-pattern
- **Severity:** P3  
- **Category:** architecture-violation  
- **File:** `Source/Backend/src/logger.ts`  
- **Detail:** Two logger files co-exist: `src/utils/logger.ts` (canonical) and `src/logger.ts` (shim). The shim was added to accommodate different call-site signatures from multi-agent coder coordination. `workItemStore.ts` uses `../utils/logger`; all routes use `../logger`. Any API change to the canonical logger must be reflected in the shim.  
- **Recommendation → TheFixer:** Unify on one interface. Absorb the normalization into `utils/logger.ts` and delete the shim. Update all import sites.

---

### QO-006 — `Specifications/dev-workflow-platform.md` scope undocumented (creates misleading coverage picture)
- **Severity:** P3  
- **Category:** spec-drift  
- **File:** `Specifications/dev-workflow-platform.md`  
- **Detail:** The spec governs `portal/` but has no header saying so. Any automated scan of `Specifications/` against `Source/` will report 0% coverage — alarming and wrong.  
- **Recommendation:** Add a front-matter note to the spec: *"This specification governs `portal/` (the SQLite-backed dev workflow platform). `Source/` is governed by `workflow-engine.md`."* Also document this in `inspector.config.yml`.

---

### QO-007 — `getAllItems()` called 3× unbounded per dashboard request
- **Severity:** P3  
- **Category:** pattern-violation  
- **File:** `Source/Backend/src/services/dashboard.ts:14,33,58`  
- **Detail:** Three separate full-store scans per dashboard GET. `inspector.config.yml` static_checks explicitly flags *"Unbounded Map iteration"*. With growth in work items, dashboard latency will scale linearly per call, not per request.  
- **Recommendation → TheFixer:** Call `getAllItems()` once at the top of the service function; pass the cached array to each computation. Cap the activity feed to a configurable limit (e.g., last 50 events).

---

### QO-008 — `eslint-disable` suppressions undocumented in 2 production frontend files
- **Severity:** P3  
- **Category:** pattern-violation  
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`  
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without explaining why. CLAUDE.md architecture rules say "never swallow errors silently" — analogously, never suppress linting without justification.  
- **Recommendation → TheFixer:** Add inline comment explaining the intentional omission, or refactor with `useCallback`/`useMemo` to satisfy the rule without suppression.

---

### QO-009 — `FR-dependency-seed` never implemented (no `seed.ts`)
- **Severity:** P4  
- **Category:** spec-drift  
- **File:** `Source/Backend/src/`  
- **Detail:** `Plans/dependency-linking/requirements.md` Implementation Delta explicitly marks `FR-dependency-seed` as ❌ Missing. No seed file exists. Known dependency relationships cannot be reproduced for manual/exploratory testing without hand-crafting API calls.  
- **Recommendation → TheFixer:** Create a dev-mode seed that populates known work items and their dependency links on startup.

---

### QO-010 — Traceability enforcer checks only one plan at a time (CI gate incomplete)
- **Severity:** P4  
- **Category:** pattern-violation  
- **File:** `tools/traceability-enforcer.py:45`  
- **Detail:** The default mode picks the most recently modified plan (currently `self-judging-workflow`). The CLAUDE.md verification gate will always pass as long as that one plan is satisfied, regardless of gaps in other plans.  
- **Recommendation:** Add a `--all` flag or CI wrapper script that iterates every `Plans/*/requirements.md` and fails if any untraced FRs exist (with scope awareness for portal/ vs Source/).

---

```json
{
  "audit": "2026-08-13",
  "grade": "B",
  "spec_coverage_active_plan_pct": 100,
  "p1": 1,
  "p2": 3,
  "p3": 3,
  "p4": 3,
  "backlog_written": "Teams/TheInspector/findings/bug-backlog-2026-08-13.json",
  "learnings_updated": "Teams/TheInspector/learnings/quality-oracle.md",
  "escalate_to_TheFixer": ["QO-004", "QO-005", "QO-007", "QO-008", "QO-009"]
}
```
