---

## Quality Oracle Findings

### Spec Coverage: **~21%** (Grade: **D**)

| Spec | FRs | Implemented | Coverage |
|------|-----|-------------|---------|
| `workflow-engine.md` | 13 | 13 | 100% |
| `dev-workflow-platform.md` | ~87 | ~11 (FR-dependency-* only) | ~13% |
| `tiered-merge-pipeline.md` | 13 | 0 in `Source/` (all in `platform/`) | 0% |

---

### QO-001 — Traceability Enforcer Blind Spot: `Specifications/` Never Scanned
- **Severity:** P1 | **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:16–57`
- **Detail:** The enforcer only targets the most-recently-modified `Plans/*/requirements.md`. The three files in `Specifications/` — which CLAUDE.md calls "the most critical documents" — are never validated by the automated gate. Running the default produces a green PASSED while 76+ requirements remain unimplemented. The gate gives false assurance.
- **Fix:** Add a second gate step: `python3 tools/traceability-enforcer.py --file Specifications/<each>.md` or extend the enforcer to accept `--spec-dir Specifications/`.

---

### QO-002 — Major Spec Drift: `dev-workflow-platform.md` FR-001–069 Fully Unimplemented
- **Severity:** P1 | **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** 69 requirements for a SQLite-backed dev workflow platform (feature requests, bug tracking, development cycles, pipeline orchestration, 9 frontend pages) are defined in `Specifications/` but have **zero implementation in `Source/`**. The `Source/` directory implements `workflow-engine.md` instead — a different system. Enforcer reports 76 MISSING when pointed at this spec.
- **Fix:** Clarify intent: annotate as `Status: Planned/Backlog` if future work, or open a P1 implementation gap in TheATeam pipeline.

---

### QO-003 — FR-TMP-* in `platform/` Is Invisible to the Enforcer
- **Severity:** P1 | **Category:** spec-drift / traceability
- **Detail:** `Specifications/tiered-merge-pipeline.md` FR-TMP-001–010 are correctly implemented in `platform/orchestrator/lib/workflow-engine.js` with proper `// Verifies:` comments — but the enforcer only scans `Source/` and `E2E/`. Pointing the enforcer at this spec returns 13 MISSING. Any regression in `platform/` traceability is invisible to the gate.
- **Fix:** Add `platform/` to the enforcer's scan dirs.

---

### QO-004 — Missing `dependencyCheckDuration` Histogram (FR-dependency-metrics)
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** FR-dependency-metrics requires 4 Prometheus metrics. Three counters are implemented; the `dependencyCheckDuration` histogram is absent. This is the BFS cycle-detection path — the most expensive operation in the dependency service — and it has no latency visibility.
- **Fix:** Add a `Histogram` for `dependency_check_duration_ms` and instrument `hasUnresolvedBlockers()` / `isReady()` in `dependency.ts`. [ESCALATE → TheFixer]

---

### QO-005 — Silent Error Swallowing: 5 Frontend Catch Blocks Without Logging
- **Severity:** P2 | **Category:** architecture-violation
- **Files:** `DependencyPicker.tsx:97`, `WorkItemDetailPage.tsx:34`, `CreateWorkItemPage.tsx:50`, `useDashboard.ts:48`, `useWorkItems.ts:53,105`
- **Detail:** Each catch sets error state for the UI but does not log. Architecture rule: "every `catch` must re-throw, log with full context, or explicitly document suppression." The frontend has no logger abstraction — a design gap that makes this rule unenforceable. The bare `catch {}` in `DependencyPicker.tsx:56` is acceptable (has suppression comment).
- **Fix:** Create `Source/Frontend/src/utils/logger.ts` (dev-mode only structured logging); instrument the 5 catch sites. [ESCALATE → TheFixer]

---

### QO-006 — eslint-disable on `react-hooks/exhaustive-deps` Without Rationale
- **Severity:** P3 | `DependencyPicker.tsx:82`, `useWorkItems.ts:63`
- Add inline comments explaining why each deps array is intentionally incomplete.

### QO-007 — Duplicate Test Files: `tests/` vs `tests/pages/`
- **Severity:** P3 | `WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` exist at both root and `tests/pages/`
- Consolidate to one location; confirm no unique cases before deleting.

### QO-008 — `DebugPortalPage.tsx`: No Traceability Comment, No Test
- **Severity:** P4 | `Source/Frontend/src/pages/DebugPortalPage.tsx`
- Add `// Verifies:` comment and a minimal render test for the iframe.

### QO-009 — Enforcer Extracts Seed Data IDs as Requirement IDs
- **Severity:** P3 | `tools/traceability-enforcer.py:64`
- Pattern `FR-[A-Z0-9-]+` matches seed data references (`FR-0003`) and template placeholders (`FR-XXX`), adding noise to MISSING reports. Tighten the extraction regex.

---

**Full report saved to:** `Teams/TheInspector/findings/audit-2026-04-16-D.md`
**Learnings updated at:** `Teams/TheInspector/learnings/quality-oracle.md`
