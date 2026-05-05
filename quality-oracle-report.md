---

## Quality Oracle Findings

**Grade: B** | 2026-05-05 | Static analysis, no services required

---

### Spec Coverage: 82%

| Specification | FRs | Traced | Coverage |
|---|---|---|---|
| `workflow-engine.md` (FR-WF-001–013) | 13 | 13 | **100%** ✅ |
| `dev-workflow-platform.md` (FR-001–069 + FR-dependency-*) | ~84 | ~75 (portal/) | **~89%** ⚠️ |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** ❌ |

> The `traceability-enforcer.py` reports **PASSED** — but it only scans `Source/` against the most-recently-modified `Plans/*/requirements.md`. This produces a false-green signal for two of the three active specs.

---

### QO-001 — Traceability Enforcer Blind Spot *(P2 · spec-drift)*
`tools/traceability-enforcer.py`, `inspector.config.yml`

The enforcer scans only `Source/` and `E2E/`. The `dev-workflow-platform.md` spec (84 FRs) is implemented in **`portal/`** (113 TypeScript files, 653 Verifies comments) — none of which are checked. Running the enforcer against that spec file explicitly reports 76 MISSING, even though they're all implemented. The `tiered-merge-pipeline.md` spec (10 FR-TMP-*) lives in `platform/`, which is also invisible to the enforcer.

**Fix:** Add `portal/` to `source.dirs` in `inspector.config.yml` and add a multi-requirements run to CI (`--file Specifications/dev-workflow-platform.md`).

---

### QO-002 — Architecture Violation: Direct DB Calls in Route Handler *(P2 · architecture-violation)*
`portal/Backend/src/routes/teamDispatches.ts:37,41,72`

Three inline SQL queries in route handlers (`db.prepare(...).all()`, `db.prepare(...).run()`) — no service layer. CLAUDE.md: **"No direct DB calls from route handlers."** File also has zero `// Verifies:` comments.

**Fix:** Extract a `teamDispatchService.ts`; route handler calls service only. **[ESCALATE → TheFixer]**

---

### QO-003 — Silent Error Swallowing in Production Component *(P2 · pattern-violation)*
`portal/Frontend/src/components/common/RepoSelector.tsx:20`

```typescript
repos.list().then((r) => setKnownRepos(r.data)).catch(() => {})
```
Empty catch silently discards API failures with no log, no user feedback. CLAUDE.md: **"Never swallow errors silently."**

**Fix:** Log the error or propagate to the component's `error` state. **[ESCALATE → TheFixer]**

---

### QO-004 — Missing Prometheus Histogram (FR-dependency-metrics incomplete) *(P3 · spec-drift)*
`Source/Backend/src/metrics.ts`

FR-dependency-metrics specifies 4 metrics. Only 3 are implemented. The **`dependencyCheckDuration` histogram** is absent — no export, no test coverage. The test file `tests/routes/metrics.test.ts` doesn't include a case for it.

**Fix:** Add the `dependency_check_duration_seconds` Histogram to `metrics.ts` and a test case.

---

### QO-005 — 3 Unlinked Recent Files (No Verifies, No Spec FR) *(P3 · spec-drift)*
- `portal/Backend/src/routes/teamDispatches.ts` — also QO-002
- `portal/Frontend/src/pages/TeamsPage.tsx` — 406 lines
- `portal/Frontend/src/components/common/RepoSelector.tsx` — 92 lines

All modified in last 14 days, all lack `// Verifies:` comments. No FR in any specification covers a "Teams Dispatch" page. These appear to be spec-less scope additions.

**Fix:** Either write spec FRs and add Verifies, or explicitly mark as exploratory code.

---

### QO-006 — FR-TMP-001–010: Zero Traceability in `platform/` *(P3 · spec-drift)*
`platform/orchestrator/lib/workflow-engine.js`, `dispatch.js`

All 10 tiered-merge-pipeline requirements are implemented in platform/ JavaScript but have zero `// Verifies: FR-TMP-XXX` comments. The enforcer can't check `platform/` (solo-session territory), but inline comments are still achievable.

---

### QO-007 — FR-048 Frontend Test Traceability Gap *(P3 · untested)*
`portal/Frontend/tests/PipelineStepper.test.tsx`

FR-048 (_"Frontend tests for PipelineStepper and updated CycleView"_) is covered in backend tests but has **0 references** in the frontend test file. PipelineStepper.test.tsx has 19 Verifies comments — all for FR-045/FR-046, not FR-048.

---

### QO-008–010 — Minor Pattern Issues *(P4)*
- **QO-008**: 10 files exceed 500 lines (5 production files: `FeatureRequestDetail.tsx` 550L, `BugDetail.tsx` 546L, `cycleService.ts` 526L, `client.ts` 525L, `featureRequestService.ts` 506L)
- **QO-009**: `// eslint-disable-next-line react-hooks/exhaustive-deps` in `Source/Frontend/src/hooks/useWorkItems.ts:63` — no explanatory comment
- **QO-010**: Enforcer regex `FR-[A-Z0-9-]+` picks up seed data item IDs (`FR-0002`, `FR-0003`) from spec prose as false-positive requirement IDs

---

Full report saved to: `Teams/TheInspector/findings/audit-2026-05-05-B.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`

**Totals: 0 P1 · 3 P2 · 4 P3 · 3 P4**
