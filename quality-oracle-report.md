---

## Quality Oracle Findings — 2026-04-26

**Grade: C** | 1 P1 · 4 P2 · 3 P3

---

### Spec Coverage

| Corpus | Requirements | Covered | % |
|--------|-------------|---------|---|
| Active plan (`FR-WF-001–013`) | 13 | 13 | **100%** ✅ |
| `FR-dependency-*` features | 16 | 14 functionally | **87.5%** ⚠️ |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 76 | 0 | **0%** — enforcer blind |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 13 | 0 | **0%** — enforcer blind |

---

### QO-001 — P1: `GET /api/search` not wired into `app.ts`
`Source/Backend/src/app.ts` · `tests/routes/search.test.ts`

The `FR-dependency-search` endpoint (`GET /api/search?q=`) has 5 written tests and a `// Verifies:` comment, but the route is **never registered** in `app.ts`. The test file even includes an explicit warning comment about this. The `workItemsApi.searchItems()` frontend function calls this URL, so the DependencyPicker typeahead is broken at runtime. **5 tests will fail on any `npm test` run.**

**Fix:** Implement the route handler in `workItems.ts` (filter `getAllItems()` by title/description, exclude deleted items, return `{data: T[]}`) and add `app.use('/api/search', …)` to `app.ts`.

---

### QO-002 — P2: Traceability enforcer is blind to `Specifications/`
`tools/traceability-enforcer.py:49-57`

The enforcer auto-selects only the most recently modified `Plans/**/requirements.md`. Running it against `Specifications/dev-workflow-platform.md` reveals **76 unmonitored FRs**; against `tiered-merge-pipeline.md`, **13 more**. This means spec drift for future product work (the full dev-workflow-platform) will go undetected indefinitely.

**Fix:** Either extend the enforcer to accept a `--specs` directory argument and map it to the correct source dir, or document in `inspector.config.yml` which spec files are intentionally out-of-scope for `Source/` (noting that `portal/` implements parts of dev-workflow-platform).

---

### QO-003 — P2: `FR-dependency-seed` — zero implementation
`Specifications/dev-workflow-platform.md` · `Source/` (absent)

The spec requires idempotent seed data creating BUG-0010 ← BUG-0003/4/5/6/7 and several FR dependency chains. The string `FR-dependency-seed` appears nowhere in `Source/`. The DependencyPicker has no pre-loaded graph to demonstrate with.

**Fix:** Add `Source/Backend/src/store/seed.ts` called from `app.ts` startup, guarded by `process.env.NODE_ENV !== 'test'`.

---

### QO-004 — P2: Missing `dependencyCheckDuration` histogram metric
`Source/Backend/src/metrics.ts`

`FR-dependency-metrics` specifies 4 metrics: 3 counters ✅ + 1 histogram (`dependencyCheckDuration`) ✗. The histogram is absent, making dependency readiness-check latency invisible to Prometheus.

**Fix:** Add a `Histogram` for `dependency_check_duration_seconds` in `metrics.ts` and instrument `isReady()` / `computeHasUnresolvedBlockers()`.

---

### QO-005 — P2: Duplicate frontend test files
`Source/Frontend/tests/` vs `Source/Frontend/tests/pages/`

`WorkItemDetailPage.test.tsx` exists at both paths (368 vs 393 lines); same for `WorkItemListPage.test.tsx` (286 vs 262 lines). The Vitest runner picks up both — causing duplicate test IDs in CI, potentially conflicting mocks, and inaccurate coverage counts.

**Fix:** Delete the stale copies in `tests/` root; keep the `tests/pages/` versions (verify with git log).

---

### QO-006 — P3: `DebugPortalPage.tsx` has invalid FR reference
`Source/Frontend/src/pages/DebugPortalPage.tsx:1`

File has `// Verifies: dev-crew debug portal` — not a valid `FR-XXX` ID. Either add a real FR or document the exemption explicitly.

---

### QO-007 — P3: Two `eslint-disable` suppressions on `react-hooks/exhaustive-deps`
`DependencyPicker.tsx:82` and `useWorkItems.ts:63`

Both suppress hook dependency warnings. Potential stale-closure bugs. Should be investigated and either fixed properly or documented with a reason comment.

---

### QO-008 — P3: `WorkItemDetailPage.tsx` approaching 500-line limit (426 lines)
`Source/Frontend/src/pages/WorkItemDetailPage.tsx`

At 85% of the architecture limit. Three inline sub-components (`WorkItemActions`, `AssessmentCard`, `ChangeHistoryTimeline`) should be extracted to `src/components/`.

---

### Pattern Enforcement Results
| Check | Result |
|-------|--------|
| `console.log` in production | ✅ Clean |
| Hardcoded secrets | ✅ Clean |
| Empty catch blocks | ✅ All log/rethrow |
| Framework imports in services | ✅ Clean |
| Shared type re-definitions | ✅ Clean |
| List endpoints with `{data: T[]}` wrappers | ✅ Compliant |
| `eslint-disable` suppressions | ⚠️ 2 |

Report saved to: `Teams/TheInspector/findings/audit-2026-04-26-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
