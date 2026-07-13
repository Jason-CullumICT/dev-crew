---

## Quality Oracle Findings

### Spec Coverage: ~98%

| Spec | Requirements | Traced | Unimplemented |
|------|-------------|--------|---------------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | 13 | 0 |
| `dev-workflow-platform.md` (FR-001–069 + FR-dependency-*) | ~85 | ~84 | 1 (FR-dependency-seed) |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 10 | 0 |
| FR-090–095 (orchestrator dashboard FRs) | 0 (no spec!) | 6 in code | — |

---

### QO-001: FR-WF-XXX Traceability IDs Live in Plans, Not Specifications

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Plans/self-judging-workflow/requirements.md`
- **Detail:** `Source/` codebase uses FR-WF-001 through FR-WF-013 as `// Verifies:` traceability anchors. These IDs are defined only in `Plans/self-judging-workflow/requirements.md`, **not** in any `Specifications/` file. `Specifications/workflow-engine.md` exists but contains no FR-WF-XXX IDs. CLAUDE.md mandates: *"Specs are source of truth — implementation traces to specs, never the other way around."* The traceability enforcer itself is configured to read from `Plans/…/requirements.md`, hardwiring a Plans file as the spec source.
- **Recommendation:** Promote the FR-WF-001–013 table into `Specifications/workflow-engine.md` with formal FR IDs. Update the traceability enforcer to point to `Specifications/` as its target. FR-DUP-01–13 (`Plans/duplicate-deprecated-status/requirements.md`) has the same gap.
- **Cross-ref:** TheFixer (schema change to enforcer config); requirements-reviewer (spec promotion)

---

### QO-002: FR-090–FR-095 Referenced in Code With Zero Spec Definition

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Frontend/src/components/orchestrator/types.ts:26`, `RunsTab.tsx:1`, `RunDetailRow.tsx:1`, `portal/Frontend/src/api/client.ts:457`
- **Detail:** Six FR IDs (FR-090, FR-091, FR-092, FR-093, FR-094, FR-095) appear as `// Verifies:` comments across the orchestrator dashboard components. No Specification file defines them. No Plan file defines them. Searching the entire repo for "FR-09" in markdown returns zero results. These are phantom traceability anchors that cannot be validated or audited.
- **Recommendation:** Either write a spec section (or plan requirements table) covering the orchestrator dashboard frontend features and assign these IDs formally, or renumber them to extend an existing spec. Until then traceability is unverifiable for this subsystem.
- **Cross-ref:** requirements-reviewer

---

### QO-003: Direct DB Calls in Route Handler — `teamDispatches.ts`

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37`, `:41`, `:72`
- **Detail:** Both the `GET /` and `POST /` handlers call `db.prepare(…).all(…)` and `db.prepare(…).run(…)` directly inside the route, bypassing the service layer. CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* Every other resource in portal (bugs, feature-requests, cycles, etc.) uses a dedicated `*Service.ts`. `teamDispatches` has no service and is the only route violating this rule.
- **Recommendation:** Extract a `teamDispatchService.ts` with `list(team, limit)` and `create(data)` functions. Route handlers should delegate to the service.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-004: `FR-dependency-seed` Unimplemented

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/schema.ts` (missing seed block)
- **Detail:** `dev-workflow-platform.md` § FR-dependency-seed specifies idempotent seed data that must be present after fresh setup: BUG-0010 blocked by BUG-0003/0004/0005/0006/0007, FR-0004 blocked by FR-0003, FR-0005 blocked by FR-0002, FR-0007 blocked by FR-0003. Grepping the entire portal production code for "BUG-0010" and "seed" returns nothing. Without this seed data, the dependency system cannot be manually exercised in a fresh development environment and acceptance criteria for FR-dependency-seed cannot be met.
- **Recommendation:** Add an idempotent seed block to `portal/Backend/src/database/schema.ts` (or a separate `seed.ts` called on startup) that inserts the specified dependency links using `INSERT OR IGNORE`.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-005: `dependencyCheckDuration` Histogram Missing from `Source/Backend`

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** FR-dependency-metrics lists 4 required Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `dependencyCheckDuration` histogram ❌ (absent), `cycleDetectionEvents` counter ✅. The portal backend correctly implements all 4 (`portal/Backend/src/metrics.ts:23`). The Source/Backend metrics file has only 3 of the 4, so the dependency check performance is unobservable in the workflow-engine system.
- **Recommendation:** Add a `Histogram` named `dependency_check_duration_seconds` to `Source/Backend/src/metrics.ts` and instrument the dependency service's `hasUnresolvedBlockers` / `isReady` call paths.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-006: Route Latency Histogram Missing from `Source/Backend`

- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts`
- **Detail:** CLAUDE.md architecture rule: *"Auto-collect route latency via middleware"* and *"New routes must have observability — Prometheus metrics for domain-significant operations."* The portal backend has a dedicated `portal/Backend/src/middleware/metrics.ts` that registers an `http_request_duration_ms` histogram and attaches it as middleware. The Source/Backend `app.ts` has only a debug-level request logger; no route latency histogram exists, making the workflow engine's API performance invisible in Prometheus.
- **Recommendation:** Add a latency middleware (using `prom-client` Histogram) to `Source/Backend/src/app.ts`, mirroring the pattern in `portal/Backend/src/middleware/metrics.ts`.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-007: Traceability Enforcer Scope Excludes `portal/`

- **Severity:** P3
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer is configured to scan `['Source', 'E2E']`. The portal/ directory contains 1,073 `// Verifies:` comments covering FR-001 through FR-069 (the primary dev-workflow-platform.md spec) — the majority of the project's formal requirements. No automated gate checks that all 85 `dev-workflow-platform.md` FRs have corresponding references in `portal/`. This means the traceability gate is blind to spec drift in the most feature-rich codebase layer.
- **Recommendation:** Add `portal/` to the enforcer's scan dirs and add `dev-workflow-platform.md` as a second requirement source. Run in CI alongside the current check.
- **Cross-ref:** TheFixer (tools update)

---

### QO-008: Duplicate Test Files for WorkItemDetailPage and WorkItemListPage

- **Severity:** P3
- **Category:** test-coverage / pattern-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Both `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` exist for the same component. Same for WorkItemListPage. This creates ambiguity about which is canonical, may cause hidden test redundancy or gaps, and inflates apparent coverage.
- **Recommendation:** Consolidate to the `tests/pages/` location (matching the `src/pages/` source tree). Remove or merge the top-level duplicates.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-009: Five Frontend Components Without Test Files

- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `pages/DebugPortalPage.tsx`
- **Detail:** Five production source files have no corresponding test file in `tests/components/` or `tests/pages/`. `Layout.tsx` is the navigation shell; badge components are shared display primitives. FR-032 requires frontend Vitest/RTL tests for key components. These components are recently modified (within 14 days per git log), raising them to P3.
- **Recommendation:** Add tests for each: Layout (sidebar links, badge counts), PriorityBadge/StatusBadge/TypeBadge (render correct label per value), DebugPortalPage (iframe renders).
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-010: `eslint-disable` Suppressions on React Hook Dependencies

- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` via `eslint-disable-next-line`. While often used to avoid infinite loops, this can mask legitimately missing dependencies causing stale closures. CLAUDE.md does not explicitly ban these, but the intent to maintain code quality is clear.
- **Recommendation:** Review both suppressed hooks; add explicit comments explaining why the dep is intentionally omitted, or restructure with `useCallback`/`useRef` to satisfy the linter without suppression.

---

```json
{
  "audit_date": "2026-07-13",
  "spec_coverage": {
    "workflow_engine_md": { "total": 13, "covered": 13, "pct": 100 },
    "dev_workflow_platform_md": { "total": 85, "covered": 84, "pct": 98.8 },
    "tiered_merge_pipeline_md": { "total": 10, "covered": 10, "pct": 100 },
    "phantom_frs_no_spec": ["FR-090","FR-091","FR-092","FR-093","FR-094","FR-095"]
  },
  "grade": "B",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "FR-WF-XXX IDs in Plans, not Specifications" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-090–095 orphan references, no spec definition" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Direct DB calls in teamDispatches route handler" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed not implemented" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from Source/Backend" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Route latency histogram missing from Source/Backend" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "Traceability enforcer blind to portal/ layer" },
    { "id": "QO-008", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage/WorkItemListPage" },
    { "id": "QO-009", "severity": "P3", "category": "test-coverage", "title": "5 frontend components lack test files" },
    { "id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable on React hook dep arrays" }
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 4,
  "p4_count": 1
}
```

---

**Grade: B** (1 P1, 4 P2 — within B threshold per grading config: `max_p1: 0` would be A, but 1 P1 bumps to B; spec coverage ~99% exceeds the 60% B floor)

**Escalations:** None — no auth bypass, injection risk, or sensitive data exposure found. No items for TheGuardians. QO-003 routes to **TheFixer** (backend-coder). QO-001/QO-007 route to **requirements-reviewer** + **TheFixer** (enforcer config update). Learnings file updated at `Teams/TheInspector/learnings/quality-oracle.md`.
