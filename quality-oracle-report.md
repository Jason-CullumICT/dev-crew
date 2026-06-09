---

## Quality Oracle Findings

**Grade: C** — 1 P1 · 3 P2 · 4 P3 · 3 P4

---

### Critical Structural Context

This codebase has **two completely separate apps**:
- `Source/` — the workflow engine (work items, in-memory store)
- `portal/` — the dev-workflow-platform (feature requests, bugs, dev cycles, SQLite)

This distinction drives almost every finding below.

---

### Spec Coverage: **100%** for `Source/` plans · **~0% reported** for `portal/` plans (tool gap, not code gap)

| Plan | FRs | Enforcer result |
|------|-----|-----------------|
| self-judging-workflow (FR-WF-001…013) | 13 | ✅ PASS — 100% |
| orchestrated-dev-cycles (FR-033…049) | 18 | ❌ FALSE FAIL — code in portal/ not scanned |
| dev-cycle-traceability (FR-050…069) | 21 | ❌ FALSE FAIL — same reason |
| duplicate-deprecated-status (FR-DUP-01…13) | 13 | ❌ FALSE FAIL — same reason |
| Specifications/dev-workflow-platform.md (FR-001…069) | 81 | ❌ Never checked at all |

---

### QO-001 — **P1** — Traceability enforcer excludes `portal/` — verification gate is broken

`tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. The `portal/` directory has **300 Verifies comments** but is completely invisible to the tool. Running the enforcer against any portal-targeting plan reports 100% failure even though the code is fully traced.

**Fix:** Add `"portal"` to `source_dirs` (one-line change), then re-run all four failing plans to confirm actual coverage.

---

### QO-002 — **P2** — Only 1 of 8 plans checked in default CI run

The enforcer auto-selects the most-recently-modified `Plans/*/requirements.md` (currently `self-judging-workflow`). Seven plans — including all portal plans — are silently skipped every time `python3 tools/traceability-enforcer.py` is called in the verification gate.

**Fix:** Loop all plans in the verification gate, or add a `--all-plans` flag.

---

### QO-003 — **P2** — FR-dependency ID mismatch between plan, Source/, and portal/

Three different ID schemes are in play for the same feature:
- Plan uses: `FR-dependency-schema`, `FR-dependency-api-types`, etc.
- `Source/` uses: `FR-dependency-service`, `FR-dependency-endpoints`, `FR-dependency-dispatch-gating`
- `portal/` uses: `FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-cycle-detection`

The enforcer also picks up data IDs from plan prose (e.g. `FR-0002`, `FR-0003` — seeded item IDs) as if they were code requirements, generating phantom failures.

---

### QO-004 — **P2** — Duplicate test files for WorkItemDetailPage and WorkItemListPage

Both exist:
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (root — stale)
- `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (canonical)
- Same pattern for WorkItemListPage

Depending on the Jest glob, one set may run silently while the other provides false coverage confidence.

---

### QO-005/006 — **P3** — Two portal production files with zero traceability

- `portal/Backend/src/routes/teamDispatches.ts` — no `Verifies:`, no test found, recently modified
- `portal/Frontend/src/pages/TeamsPage.tsx` — no `Verifies:`, recently modified

Both are unlinked implementations. Per CLAUDE.md: write the spec first.

---

### QO-007 — **P3** — `WorkItemDetailPage.tsx` at 426 lines, approaching 500-line limit

Extract `AssessmentCard` and `ChangeHistoryTimeline` sub-components before the next feature push pushes it over.

---

### QO-008 — **P3** — Two `eslint-disable-next-line react-hooks/exhaustive-deps` without explanation

- `Source/Frontend/src/hooks/useWorkItems.ts:63`
- `Source/Frontend/src/components/DependencyPicker.tsx:82`

Neither has a comment explaining the intentional omission. Add one-line explanations to prevent future contributors from re-adding the dependency.

---

### QO-009 — **P3** — `Specifications/dev-workflow-platform.md` FR-001…069 never enforced

The 81 FRs in the canonical domain spec are never programmatically verified. The enforcer only checks Plans-level FRs. A spec requirement could be quietly dropped from a plan without detection.

---

Full report and JSON summary saved to:
`Teams/TheInspector/findings/audit-2026-06-09-quality-oracle.md`

Learnings updated at:
`Teams/TheInspector/learnings/quality-oracle.md`
