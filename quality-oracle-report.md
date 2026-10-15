---

## Quality Oracle Findings — Full Audit Summary

**Grade: C** | **Spec Coverage: 67%** (26/39 app-relevant FRs) | **2 P1 · 4 P2 · 2 P3 · 1 P4**

---

### Spec Coverage

| Spec | FRs | Traced | % |
|------|-----|--------|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | 100% ✅ |
| `Specifications/dev-workflow-platform.md` (FR-dependency-*) | 16 | 13 | 81% ⚠️ |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | 0% ❌ |
| **Total** | **39** | **26** | **67%** |

---

### Findings

**QO-001 [P1] — `/api/search` not wired — FR-dependency-search unimplemented**  
`Source/Backend/src/app.ts` has no search route registration. `search.test.ts` line 3–6 openly admits: _"these tests will FAIL until the route is implemented."_ The DependencyPicker typeahead has no backend. Fix: create `Source/Backend/src/routes/search.ts` and register it in `app.ts`.

**QO-002 [P1] — Spec corpus mismatch: `dev-workflow-platform.md` describes a different app**  
`Specifications/dev-workflow-platform.md` (FR-001..FR-069) specifies a SQLite-backed platform for feature requests, bug reports, and dev cycles — not the in-memory workflow engine that Source/ actually implements. The traceability enforcer reads Plans/ and reports 100% pass, masking this gap. Architecture rule violated: _"Specs are source of truth."_

**QO-003 [P2] — `dependency_check_duration_seconds` histogram missing (FR-dependency-metrics)**  
`metrics.ts` has 3 counters for FR-dependency-metrics but the required **histogram** for BFS dependency check latency is absent. The test file doesn't catch it either.

**QO-004 [P2] — FR-TMP-001..FR-TMP-010 (Tiered Merge Pipeline): 0% in Source/**  
All 10 requirements in `Specifications/tiered-merge-pipeline.md` — risk classification, E2E runner, auto-PR, AI review, auto-merge — have zero `// Verifies: FR-TMP-*` comments in Source/. Either they live in `platform/` (undocumented) or are not yet built.

**QO-005 [P2] — Traceability enforcer validates Plans/, not Specifications/**  
`tools/traceability-enforcer.py` targets the most-recently-modified `Plans/*/requirements.md`. The Specifications/ directory (the domain truth per CLAUDE.md) is never enforced. A green enforcer run does not mean Specifications are implemented.

**QO-006 [P2] — FR-dependency-seed never implemented**  
Seed data for known dependency relationships (BUG-0010 blocked_by several bugs, etc.) is specified but no seed file exists. Acceptance criterion _"known dependencies present after fresh setup"_ cannot be met.

**QO-007 [P3] — Inconsistent `@shared` vs `../../../Shared/` imports**  
`WorkItem.ts` uses the TypeScript path alias `@shared/`; all other backend files use relative paths. Standardize to one pattern.

**QO-008 [P3] — `eslint-disable` in production frontend code**  
Two `react-hooks/exhaustive-deps` suppressions in `DependencyPicker.tsx:82` and `useWorkItems.ts:63`. Architecture rule: _"No disabled linting rules."_ The `useWorkItems` case risks stale-closure bugs on param changes.

**QO-009 [P4] — Duplicate logger barrel**  
`src/logger.ts` exists only to re-export `src/utils/logger.ts`. Remove the redundant file and standardize imports.

---

**Clean passes:** no `console.log` in production, no hardcoded secrets, no silent catch blocks, no skipped tests, no TODO/FIXME debt, all list endpoints return `{data: T[]}` wrappers.

**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
