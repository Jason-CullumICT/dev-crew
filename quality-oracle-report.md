---

## Quality Oracle Findings — 2026-08-19

**Grade: D** | Spec coverage (all Specifications/): **~31%** | Enforcer-tracked coverage: **100%**
P1: 1 | P2: 3 | P3: 3

---

### QO-001 — P1 · spec-drift
**Primary spec `dev-workflow-platform.md` has 0% source coverage**

`Specifications/dev-workflow-platform.md` is labeled "The most critical documents" in CLAUDE.md and defines 69 FRs (FR-001 through FR-069) for a SQLite-backed 7-subsystem platform (FR intake, AI voting, human approval, bug tracking, dev cycles, CI/CD). **Zero** source files carry a `// Verifies: FR-0NN` comment. The source implements `workflow-engine.md` using the separate `FR-WF-*` ID scheme from `Plans/self-judging-workflow/requirements.md`.

Two interpretations, both serious: either the wrong system was built, or the primary spec is aspirational and CLAUDE.md is misleading. Needs a decision and documentation. **Escalate to requirements-reviewer before next sprint.**

---

### QO-002 — P2 · spec-drift
**`tiered-merge-pipeline.md` (FR-TMP-001..010) is fully unimplemented**

All 10 requirements (risk classification, Playwright E2E generation, auto-PR creation, AI review, auto-merge) have zero `// Verifies: FR-TMP-*` references anywhere under `Source/`. The `Source/E2E/` directory exists but covers the workflow engine, not the merge pipeline. Route to TheFixer/TheATeam as a new pipeline task.

---

### QO-003 — P2 · spec-drift
**Missing `dependencyCheckDuration` histogram (`FR-dependency-metrics`)**
`Source/Backend/src/metrics.ts`

FR-dependency-metrics requires 4 Prometheus metrics. Three counters are present; the **`dependencyCheckDuration` histogram** (`dependency_check_duration_seconds`) is absent. The test file `metrics.test.ts` also does not check for it. Route to backend-coder via TheFixer.

---

### QO-004 — P2 · architecture-violation
**Traceability enforcer only checks 13 of ~96 spec requirements**
`tools/traceability-enforcer.py`

The enforcer reads `Plans/self-judging-workflow/requirements.md` (13 FRs) and always reports PASSED even though 69 FRs in `dev-workflow-platform.md` and 10 in `tiered-merge-pipeline.md` are completely untraced. The CLAUDE.md verification gate gives false confidence. Fix in `tools/` (solo session — no pipeline needed).

---

### QO-005 — P3 · test-coverage
**Duplicate test files for WorkItemListPage and WorkItemDetailPage**

Both `Source/Frontend/tests/WorkItemListPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` cover FR-WF-010. Same duplication for WorkItemDetailPage (FR-WF-011). The `pages/` structure better mirrors `src/pages/`; delete or merge the root-level duplicates.

---

### QO-006 — P3 · pattern-violation
**`eslint-disable react-hooks/exhaustive-deps` in 2 files**
- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Suppressing the hooks exhaustive-deps rule hides potential stale-closure bugs. Fix the dependency arrays instead of suppressing.

---

### QO-007 — P3 · pattern-violation
**Hardcoded `localhost:4200` fallback in DebugPortalPage**
`Source/Frontend/src/pages/DebugPortalPage.tsx:5`

`VITE_PORTAL_URL || 'http://localhost:4200'` violates the "no hardcoded URLs" rule. The fallback masks misconfiguration in non-local environments. Remove the inline fallback; add the value to `.env.example`/`.env.development` instead.

---

**Clean checks:** no `console.log` in production source · service layer intact · shared types single-source · all catch blocks log or re-throw · list endpoints return `{data:[]}` wrappers · structured logging throughout.

Full report saved: `Teams/TheInspector/findings/audit-2026-08-19-D.md`
