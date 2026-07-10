Now the full report:

---

## Quality Oracle Findings — 2026-07-10

### Spec Coverage: ~13%

| Scope | FRs Defined | Traced | Coverage |
|---|---|---|---|
| Specifications/dev-workflow-platform.md | 74 | 0 | **0%** |
| Plans/self-judging-workflow (active) | 13 | 13 | **100%** |
| Plans/dev-workflow-platform | 34 | 0 | **0%** |
| Plans/dependency-linking | 7 (legacy format) | 0 via enforcer | **~0%** |
| Plans/dev-cycle-traceability + others | ~83 | 0 | **0%** |

**Grade: D** (spec coverage below 40% threshold for C; 1 P1 finding)

---

### QO-001: Traceability Enforcer Has a Scope Blindspot — CI Gate Reports False PASSED
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (default plan selection logic)
- **Detail:** The enforcer picks the **most-recently-modified** `requirements.md` by default. That is currently `Plans/self-judging-workflow/requirements.md` (13 FRs, all passing). Running the enforcer against `Plans/dev-workflow-platform/requirements.md` returns **34 MISSING** requirements. Against `Plans/dependency-linking/requirements.md` it returns **7 MISSING**. The CI gate (`python3 tools/traceability-enforcer.py`) prints `TRACEABILITY PASSED` while over 34 plan requirements and 74 spec requirements have zero implementation references. Any team that trusts this gate believes coverage is complete when it is ~13%.
- **Recommendation:** Change the enforcer default to either (a) scan **all** `requirements.md` files under Plans/ and aggregate failures, or (b) require an explicit `--plan` argument so it fails loudly when not targeted. A combined run like `for f in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$f" || exit 1; done` as the CI gate would surface all gaps immediately.
- **Cross-ref:** TheFixer (tooling fix); impacts all pipeline QA gates

---

### QO-002: Specifications/dev-workflow-platform.md FR-001–FR-069 Completely Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (74 FRs defined)
- **Detail:** The canonical domain specification defines a complete feature-request/bug-report/development-cycle platform (FR-001 feature request CRUD with AI voting; FR-013 bug reports; FR-014–016 dev cycles; FR-022–030 frontend pages including FR, bug, cycle, approvals, features, learnings views; FR-033–049 pipeline orchestration; FR-050–069 cycle traceability). **None of these are present in `Source/`**. What IS implemented is the self-judging workflow engine (Work Items), a separate design documented in `Plans/self-judging-workflow/` — not the Specifications. The Specifications represent the domain truth but the implementation follows the Plans. This is either intentional phase-gating (Specifications are the target; Plans are the current sprint) or true spec abandonment.
- **Recommendation:** If the Specifications represent future phases, add a `Status: Phase-N` header to each spec section and update `CLAUDE.md` to explain the phased delivery model. If the Specifications were superseded by the self-judging-workflow design, archive them with a note. Either way, the gap must be acknowledged and tracked — currently it is invisible to the gate.
- **Cross-ref:** requirements-reviewer; QO-001 (enforcer blindspot hides this)

---

### QO-003: Routes Import Store Directly — Service Layer Bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** Architecture rule from CLAUDE.md: **"No direct DB calls from route handlers — use the service layer."** Three route files import `* as store from '../store/workItemStore'` and call store functions directly in request handlers: `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()`. This means business validation logic lives in route handlers rather than services, making it untestable in isolation. The `router.ts` and `assessment.ts` services correctly own their store interactions; `workItems.ts` does not delegate.
- **Failure scenario:** A new coder adds an additional CRUD route and calls `store.createWorkItem()` directly, skipping the change-history tracking in `changeHistory.ts`, resulting in silent data corruption.
- **Recommendation:** Extract a `WorkItemService` (or reuse/extend `changeHistory.ts`) that owns all store calls. Route handlers call service methods; services call the store. No route file should import from `store/`.

---

### QO-004: OpenTelemetry Tracing Not Implemented — Mandatory Architecture Rule Violated
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/` (entire directory)
- **Detail:** CLAUDE.md mandates: "Use OpenTelemetry for distributed tracing. Auto-instrument HTTP, database, and framework calls. Add custom spans for critical paths. Propagate W3C `traceparent` header across service boundaries." Zero OTel imports exist anywhere in `Source/Backend/src/`. The `app.ts` has no OTel instrumentation setup. No span creation appears in services. This is an explicit non-negotiable architecture rule that is entirely missing.
- **Failure scenario:** A production incident occurs; there are no distributed traces to diagnose which workflow stage failed or how long each step took. Prometheus metrics alone cannot reconstruct request flow across the route → service → store chain.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`; configure in a `src/telemetry.ts` initializer loaded before `app.ts`; add custom spans in `router.ts` and `assessment.ts` for critical path operations. Add `traceparent` header propagation middleware.
- **Cross-ref:** TheFixer (implementation); TheGuardians (OTel affects observability posture)

---

### QO-005: Duplicate Test Files — Vitest Runs Both Copies
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); same for WorkItemListPage
- **Detail:** Two versions of the same test exist side-by-side. Vitest's `vite.config.ts` has no explicit `include` pattern, so it discovers all `*.test.*` files recursively — including both. The root-level file uses simpler mocks; the `pages/` subdirectory version uses full type imports from `Shared/types/workflow.ts`. Running `npm test` in `Source/Frontend/` executes 39 additional redundant test cases (19+20 for DetailPage, 16+12 for ListPage), inflating the pass count and masking which version actually validates the production code. The two files have divergent mock setups and import paths, meaning they may test subtly different behaviors.
- **Failure scenario:** A developer fixes a bug verified by the `pages/` version but accidentally breaks the root-level version's mock contract; CI passes because `pages/` tests pass, but the root-level tests flag a different regression that gets attributed to the same test file name.
- **Recommendation:** Delete the root-level duplicates (`tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`) — the `tests/pages/` versions are more complete (they import shared types; they have more test cases). Add an explicit `test.include: ['tests/**/*.test.*']` to `vite.config.ts` to prevent re-introduction.

---

### QO-006: Plans/dependency-linking Requirements Reference Stale `portal/` Paths
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Plans/dependency-linking/requirements.md`
- **Detail:** The requirements were authored for a `portal/Backend/` and `portal/Frontend/` directory structure. The implementation was delivered in `Source/Backend/` and `Source/Frontend/` instead. The "Implementation Delta" table in the requirements file marks items as ❌ Missing that are actually ✅ implemented (e.g., `FR-dependency-frontend-tests` shows missing but `Source/Frontend/tests/components/BlockedBadge.test.tsx`, `DependencyPicker.test.tsx`, and `DependencySection.test.tsx` all exist). Running `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` reports 7 MISSING because the requirements use legacy FR-0002..FR-0007 and FR-070/FR-085 numbering rather than the FR-dependency-* IDs actually used in source.
- **Recommendation:** Update `Plans/dependency-linking/requirements.md` to (a) replace `portal/` paths with `Source/` paths, (b) update the Implementation Delta table to reflect actual Source/ state, and (c) update FR IDs to match the FR-dependency-* scheme used in source code. This ensures the enforcer can validate dependency features accurately.

---

### QO-007: Dual Logger Abstraction — Two Logger Files with Different Interfaces
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two separate logger files exist. `utils/logger.ts` is the canonical implementation (pino or similar). `src/logger.ts` is a compatibility shim that re-exports `utils/logger` with a different calling convention (accepts `string | Record<string, unknown>` vs the underlying `(msg, ctx)` signature). This exists because different coders used different logger import paths and call styles. Both are traceable to FR-WF-013. New coders must know which to import — a violation of the "single source of truth" architecture rule.
- **Recommendation:** Pick one interface, update all callers, delete the shim. The `utils/logger.ts` interface is more standard; update the 4-5 callers in routes/services that use the shim's object-signature form.

---

### QO-008: `eslint-disable` Suppressions Without Documented Justification
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files disable `react-hooks/exhaustive-deps` without an explanation comment. This is the most commonly misused disable — it typically indicates a real stale-closure bug that was suppressed rather than fixed. The rule was violated during initial development and commented away.
- **Recommendation:** Investigate both locations. If the deps are intentionally omitted (e.g., a stable ref), add `// intentionally omitting X — ref is stable per Y` comment. If the omission causes a stale closure, fix the hook. Remove the disables after resolution.

---

### QO-009: DebugPortalPage Uses Non-conformant Traceability ID
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file has `// Verifies: dev-crew debug portal` which does not match the `FR-XXX` pattern. The traceability enforcer uses regex `FR-[A-Z0-9-]+` and will never recognize this comment as a traceability reference. The DebugPortalPage feature has no corresponding FR in any spec or plan file.
- **Recommendation:** Either (a) create a spec requirement for the debug portal page and assign it an FR-WF-XXX ID, or (b) if this is infrastructure code exempt from spec tracing, note it explicitly in CLAUDE.md as an exception category.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-10",
  "grade": "D",
  "spec_coverage_pct": 13,
  "total_spec_frs": 74,
  "total_plan_frs": 137,
  "traced_frs": 27,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer CI gate reports false PASSED" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Specifications FR-001–FR-069 completely unimplemented (0% Spec coverage)" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Routes import store directly, bypassing service layer" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "OpenTelemetry not implemented despite mandatory architecture rule" },
    { "id": "QO-005", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files — vitest runs both copies" },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "dependency-linking requirements reference stale portal/ paths" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "Dual logger abstraction violates single-source-of-truth rule" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions without documented justification" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation", "title": "DebugPortalPage uses non-conformant traceability ID format" }
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 4,
  "p4_count": 0,
  "escalations": []
}
```

---

**Key Systemic Pattern:** The project has a *two-tier requirements gap*. The Specifications represent the long-term platform vision; the Plans represent sprint-level designs. The self-judging-workflow plan is 100% implemented. Everything else — including the broader platform spec — has 0% implementation coverage. The traceability gate is calibrated only for the active sprint plan, so the gap is invisible in CI. Closing QO-001 (the gate blindspot) will immediately surface QO-002 through QO-005 as hard failures, which is the correct behavior.
