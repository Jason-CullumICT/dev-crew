---

## Quality Oracle Findings

### Spec Coverage: ~22%
- **8 plan requirements files** scanned, totalling ~120+ requirement IDs
- **26 requirements** traced to source code (FR-WF-001–013 and FR-dependency-*)
- **~94 requirements** unimplemented or untraced across 7 plans
- **Overall Grade: D** (minimum 40% required for Grade C)

---

### QO-001: Traceability Gate Reports False "PASSED" — Masks ~94 Unimplemented Requirements
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:49–57`
- **Detail:** The enforcer's default mode picks the **most recently modified** `requirements.md` in `Plans/`. That happens to be `Plans/self-judging-workflow/requirements.md` (13 requirements, all implemented). Running `python3 tools/traceability-enforcer.py` — the exact command prescribed in `CLAUDE.md` — outputs `TRACEABILITY PASSED` while 7 other plans are failing:
  - `dev-workflow-platform`: **34 missing** (FR-001 to FR-032)
  - `dev-cycle-traceability`: **21 missing** (FR-050 to FR-069)
  - `orchestrated-dev-cycles`: **18 missing** (FR-033 to FR-049)
  - `duplicate-deprecated-status`: **15 missing** (FR-0008, FR-0009, FR-DUP-*)
  - `dependency-linking`: **7 missing** (FR-0002–FR-0007)
  - `image-upload` / `orchestrator-cycle-dashboard`: **~15 missing** (FR-070+)
- **Recommendation:** Either (a) update `CLAUDE.md` verification gates to enumerate all plans explicitly (`python3 tools/traceability-enforcer.py --plan dev-workflow-platform && ...`), or (b) modify the enforcer to scan **all** `requirements.md` files and aggregate results.
- **Cross-ref:** TheFixer for enforcer code change; TheGuardians if build CI relies on this gate

---

### QO-002: GET /api/search Route Never Registered — FR-dependency-search Is Broken
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (missing route registration); `Source/Backend/tests/routes/search.test.ts:3–6`
- **Detail:** `FR-dependency-search` requires `GET /api/search` for the `DependencyPicker` typeahead component. The test file itself documents the gap at lines 3–6: *"these tests document the expected contract and will FAIL until the route is implemented."* `app.ts` has no `import` or `app.use` for a search router. The `DependencyPicker` modal in the frontend will fail silently (empty search results).
- **Recommendation:** Create `Source/Backend/src/routes/search.ts`, register it in `app.ts` as `app.use('/api/search', searchRouter)`, and add `// Verifies: FR-dependency-search` to the route file.
- **Cross-ref:** [ESCALATE → TheFixer] for implementation

---

### QO-003: Massive Spec Drift — FR-001 to FR-069 Entirely Unimplemented in Source/
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:337–452`
- **Detail:** `Specifications/dev-workflow-platform.md` defines 69 functional requirements (FR-001 through FR-069) covering: Feature Request APIs, Bug Report APIs, Development Cycle APIs, Dashboard APIs, Pipeline Orchestration, Dev Cycle Traceability, and a full frontend. Zero `// Verifies: FR-001` through `// Verifies: FR-069` comments exist anywhere in `Source/`. The current `Source/` codebase implements the "self-judging workflow engine" (FR-WF-001–013), which is a completely different system. Either the spec is aspirational/future-state, or the implementation has diverged without documenting the decision.
- **Recommendation:** Add a status banner to `Specifications/dev-workflow-platform.md` declaring its lifecycle state (FUTURE / SUPERSEDED / ACTIVE). If active, create a traceability gap issue for TheFixer. If superseded by the self-judging workflow, mark it explicitly.
- **Cross-ref:** TheFixer for implementation gap; requirements-reviewer to update spec lifecycle status

---

### QO-004: FR-ID Format Mismatch Between dependency-linking Plan and Code
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dependency-linking/requirements.md:1–73` vs `Source/Backend/src/services/dependency.ts:1–25`
- **Detail:** `Plans/dependency-linking/requirements.md` uses short numeric IDs: `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`. The actual implementation uses semantic IDs: `FR-dependency-service`, `FR-dependency-types`, `FR-dependency-dispatch-gating`, etc. The enforcer reports all 7 as missing because no code contains `// Verifies: FR-0002`. The traceability exists conceptually but is invisible to tooling.
- **Recommendation:** Either update `Plans/dependency-linking/requirements.md` to use the semantic ID format that matches the code, or add aliasing comments (`// Verifies: FR-0002 (= FR-dependency-service)`) in the relevant source files.
- **Cross-ref:** TheFixer for the alias comments

---

### QO-005: Two ESLint Suppression Comments Hide Potential Stale-Closure Bugs
- **Severity:** P2
- **Category:** pattern-violation / architecture-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`; `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files use `// eslint-disable-next-line react-hooks/exhaustive-deps` to silence the React hooks exhaustive-deps rule. CLAUDE.md architecture rules prohibit `eslint-disable` comments. The `exhaustive-deps` rule specifically catches stale closures in `useEffect`/`useCallback`, which can cause silent data bugs (e.g., operating on a snapshot of state instead of the current value). Both files are recently modified (within 14 days).
- **Recommendation:** Fix the underlying dependency arrays to satisfy the rule, or if the omission is intentional, document why in a comment above the suppression and get a code-review sign-off.
- **Cross-ref:** [ESCALATE → TheFixer] for fix

---

### QO-006: Traceability Enforcer Silently Skips Scans on Missing Plans
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:119–120`
- **Detail:** When no `requirements.md` is found, the enforcer exits with `sys.exit(0)` (success) and prints "No active requirements file found." This means a CI environment with a misconfigured `--plan` argument produces a green exit code rather than an error, masking the failure.
- **Recommendation:** Change the exit code to `sys.exit(1)` when no requirements file is found, unless a `--no-fail-on-missing` flag is explicitly passed.

---

### QO-007: Specifications Directory Contains No Lifecycle/Status Markers
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- **Detail:** None of the three specification files contain a status field (`ACTIVE`, `SUPERSEDED`, `DRAFT`, `IMPLEMENTED`). `dev-workflow-platform.md` defines 69 requirements that are entirely unimplemented. Without lifecycle markers, it is impossible to distinguish active requirements from historical or aspirational ones. New team members cannot determine which specs govern the current implementation.
- **Recommendation:** Add a frontmatter or header block to each specification: `Status: ACTIVE | SUPERSEDED | DRAFT | PLANNED`. Mark `dev-workflow-platform.md` as appropriate.

---

### JSON Summary

```json
{
  "audit_date": "2026-10-12",
  "spec_coverage_pct": 22,
  "grade": "D",
  "total_requirements_in_plans": 120,
  "implemented_requirements": 26,
  "unimplemented_requirements": 94,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift/architecture-violation", "title": "Traceability gate reports false PASSED"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift/untested", "title": "GET /api/search never registered in app.ts"},
    {"id": "QO-003", "severity": "P1", "category": "spec-drift", "title": "FR-001 through FR-069 entirely unimplemented"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-ID format mismatch in dependency-linking plan"},
    {"id": "QO-005", "severity": "P2", "category": "pattern-violation", "title": "Two eslint-disable suppressions hide stale-closure risk"},
    {"id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Enforcer silently exits 0 when plan not found"},
    {"id": "QO-007", "severity": "P3", "category": "doc-stale", "title": "Specifications have no lifecycle status markers"}
  ],
  "p1_count": 3,
  "p2_count": 2,
  "p3_count": 2,
  "plans_checked": ["self-judging-workflow", "dev-workflow-platform", "orchestrated-dev-cycles", "dev-cycle-traceability", "dependency-linking", "image-upload", "orchestrator-cycle-dashboard", "duplicate-deprecated-status"],
  "plans_passing": ["self-judging-workflow"],
  "plans_failing": ["dev-workflow-platform", "orchestrated-dev-cycles", "dev-cycle-traceability", "dependency-linking", "image-upload", "orchestrator-cycle-dashboard", "duplicate-deprecated-status"]
}
```

---

**Grade: D** — 3 P1 findings and 22% spec coverage (minimum 40% required for Grade C).

**Highest-priority actions for TheFixer:**
1. Register `GET /api/search` in `app.ts` (QO-002 — the DependencyPicker is broken)
2. Fix the CLAUDE.md verification gate to run the enforcer against all plans, not just the most recent (QO-001)
3. Resolve the spec lifecycle ambiguity for FR-001–069 so teams know whether they are active requirements (QO-003)
