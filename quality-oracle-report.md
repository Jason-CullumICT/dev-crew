---

## Quality Oracle Findings

### Spec Coverage

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `Plans/self-judging-workflow/requirements.md` (active) | 13 | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` (orphaned?) | ~85 | 0 | **0%** ❌ |
| **Weighted total** | ~98 | 13 | **13%** |

The traceability enforcer passes — but it only covers 13 of ~98 spec requirements because it silently auto-selects the most-recently-modified `requirements.md`.

---

### QO-001: `dev-workflow-platform.md` has ~85 requirement rows with zero implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 through FR-069 + FR-dependency-*)
- **Detail:** The `Source/` directory implements the *Self-Judging Workflow Engine* (FR-WF-001..013), an entirely different domain than what `dev-workflow-platform.md` specifies (a feature-request platform with SQLite, cycle management, learnings, pipeline orchestration, etc.). The ~85 FR rows in `dev-workflow-platform.md` have zero counterparts in `Source/`. Per the grading config, ≥80% spec coverage is required for grade A — this spec shows 0%.
- **Recommendation:** Resolve the ambiguity: either (a) mark `dev-workflow-platform.md` as "deferred/future" with an explicit status header, or (b) confirm it is a parallel project spec and exclude it from this project's traceability scope by updating `inspector.config.yml`'s `specs.dir` or adding an `exclude` list.
- **Cross-ref:** Traceability enforcer, grading config

---

### QO-002: Traceability enforcer silently targets only the most-recently-modified plan
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:50` (most-recent fallback logic)
- **Detail:** Without a `--plan` argument, the enforcer picks the most-recently-modified `requirements.md`. This currently resolves to `Plans/self-judging-workflow/requirements.md` (13 FRs). As new plans are added, the target shifts. This means entire requirement sets can slip out of enforcement silently. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) passes with green output while covering only 13% of spec surface.
- **Recommendation:** Pin the enforcer to a canonical requirements file in `inspector.config.yml` or pass `--plan self-judging-workflow` explicitly in the verification gate command.

---

### QO-003: Inspector config traceability regex doesn't match codebase's actual FR format
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Teams/TheInspector/inspector.config.yml:37`
- **Detail:** The config specifies `traceability: "FR-\\d+"` but every traceability comment in source uses `FR-WF-\d+` or `FR-dependency-*` formats. A grep for `FR-\d+` would return zero matches in `Source/`, making any config-driven coverage check report 0% — a false negative. The regex should be `FR-[A-Z-]*\d+` or `FR-(WF|dependency[a-z-]*)[-\d]+` to capture the actual patterns.
- **Recommendation:** Update `specs.patterns.traceability` in `inspector.config.yml` to match the real format: `"FR-(WF-\\d+|dependency[a-z-]*)"`.

---

### QO-004: Route handlers directly import the in-memory store, bypassing the service layer
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12`
  - `Source/Backend/src/routes/workflow.ts:15`
  - `Source/Backend/src/routes/intake.ts:4`
- **Detail:** Architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import `* as store from '../store/workItemStore'` and call store functions directly. Only `dashboard.ts` and `dependency.ts` correctly route through services. This creates a direct coupling between HTTP layer and persistence layer, making the store un-swappable and business logic untestable in isolation.
- **Recommendation:** Extract CRUD logic from route handlers into `services/workItemService.ts` and `services/intakeService.ts`. Route handlers should only parse request/response and delegate.

---

### QO-005: OpenTelemetry distributed tracing not implemented despite architecture mandate
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/` (no `@opentelemetry/*` found anywhere)
- **Detail:** `CLAUDE.md` mandates: *"Use OpenTelemetry for distributed tracing; Auto-instrument HTTP, database, and framework calls; Add custom spans for critical paths; Propagate W3C `traceparent` header across service boundaries."* No OTel packages are installed or imported. `FR-WF-013` covers structured logging and Prometheus metrics, but OTel tracing is an additional architecture rule that was not captured in the plan's FR. The `workflow.ts` state-machine paths and `assessment.ts` pod aggregation are critical paths with no trace spans.
- **Recommendation:** Add `@opentelemetry/sdk-node` + auto-instrumentations. Create a `tracing.ts` initializer called before `app.ts` starts. Add custom spans to `routeWorkItem`, `runAssessmentPod`, and `dispatchWorkItem`. [ESCALATE → TheFixer]

---

### QO-006: Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (root, 14 tests)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (pages/, 15 tests)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (root, 12 tests)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (pages/, 11 tests)
- **Detail:** Two separate test suites cover each of these pages with overlapping but different coverage. Both carry `// Verifies: FR-WF-010/011` comments. This creates maintenance debt — a component change must be reflected in two test files. It also inflates the test count without adding meaningful coverage.
- **Recommendation:** Consolidate: keep the `pages/` subdirectory versions (they're more complete), delete the root-level duplicates.

---

### QO-007: `DebugPortalPage.tsx` has no FR linkage
- **Severity:** P4
- **Category:** untested
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The Verifies comment reads `"dev-crew debug portal — embedded container-test viewer"` — no FR-* identifier. This page has no corresponding test file and no spec requirement. It may be legitimate infrastructure but is undocumented.
- **Recommendation:** Add a spec entry or Plans note for this page, or mark it explicitly as out-of-spec infrastructure with a comment explaining why.

---

### QO-008: `eslint-disable` suppressions on `react-hooks/exhaustive-deps` in two production files
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. This rule catches stale-closure bugs. Suppressing it without a documented reason is a pattern violation per CLAUDE.md's code pattern enforcement. These may hide genuine dependency issues or intentional one-shot effects that should be self-documenting.
- **Recommendation:** Either fix the hooks to include all dependencies correctly, or add a comment explaining the intentional suppression (e.g., `// intentional: runs once on mount only`).

---

```json
{
  "audit_date": "2026-10-23",
  "spec_coverage": {
    "active_plan_pct": 100,
    "active_plan_requirements": 13,
    "active_plan_traced": 13,
    "orphaned_spec_pct": 0,
    "orphaned_spec_requirements": 85,
    "orphaned_spec_traced": 0,
    "weighted_total_pct": 13
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift",           "title": "dev-workflow-platform.md ~85 FRs have 0% implementation" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift",           "title": "Enforcer silently targets most-recent plan only" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift",           "title": "inspector.config traceability regex doesn't match code format" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","title": "Route handlers bypass service layer (direct store imports)" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation","title": "OpenTelemetry tracing missing despite CLAUDE.md mandate" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage",        "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P4", "category": "untested",             "title": "DebugPortalPage has no FR linkage or test coverage" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation",    "title": "eslint-disable-next-line suppressions in 2 production files" }
  ],
  "grade": "C",
  "grade_rationale": "P1 count=1 (exceeds A/B threshold). Active spec 100% covered; orphaned spec 0% — overall weighted 13%. Architecture violations on service-layer bypass and missing OTel.",
  "escalations": []
}
```

---

**Learnings file updated** at `Teams/TheInspector/learnings/quality-oracle.md`.
