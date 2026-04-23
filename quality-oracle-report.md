---

## Quality Oracle Findings

**Grade: C** | Audit date: 2026-04-23

### Spec Coverage

| Specification | Req Count | Coverage |
|---|---|---|
| `workflow-engine.md` (FR-WF-\*) | 13 | ✅ **100%** |
| `dev-workflow-platform.md` (FR-001..069 + FR-dependency-\*) | ~85 | ✅ **~96%** |
| `tiered-merge-pipeline.md` (FR-TMP-\*) | 10 | ⚠️ **90%** (see QO-007) |
| **Reverse drift — FR-070..095, FR-DUP-01..13 in code, no spec entry** | 40 | ❌ **Unspecced** |

---

### QO-001 — 40 FR IDs implemented with no canonical Specification `[P1 · spec-drift]`
`portal/**` references FR-070..FR-095 (26), FR-DUP-01..FR-DUP-13 (13), and FR-0001 (1). These IDs appear only in Plans files — they were never back-ported to `Specifications/dev-workflow-platform.md`, which stops at FR-069. Architecture rule violated: *"Specs are source of truth — implementation traces to specs, never the other way around."* **→ Route to requirements-reviewer / TheFixer.**

### QO-002 — FR-dependency-api-types STILL OPEN `[P2 · spec-drift]`
`portal/Shared/api.ts` — `UpdateBugInput` and `UpdateFeatureRequestInput` still lack `blocked_by?: string[]`. Frontend `DependencyPicker.tsx:291,293` still uses `as any` cast workarounds. **Fix:** add the field to both interfaces; remove the casts.

### QO-003 — FR-dependency-seed STILL OPEN `[P2 · spec-drift]`
`portal/Backend/src/database/seed.ts` does not exist. Dependency seed data (BUG-0010 blocked by 5 others, etc.) is never loaded on startup. **Fix:** create `seed.ts` and wire into `index.ts` startup.

### QO-004 — FR-dependency-frontend-tests STILL OPEN `[P2 · untested]`
`portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` are both missing. DependencyPicker is tested; these two components are not. **Fix:** create both test files with `// Verifies:` comments.

### QO-005 — Direct SQL in teamDispatches route handler + zero traceability `[P2 · architecture-violation]`
`portal/Backend/src/routes/teamDispatches.ts` executes raw `db.prepare(...).all()` SQL directly in the route handler — the only portal route that completely bypasses the service layer. It also has **0 Verifies comments**. All other portal routes correctly delegate to service functions. **Fix:** extract into `teamDispatchService.ts`; add traceability comments.

### QO-006 — Traceability enforcer gate covers only 13 of 100+ requirements `[P2 · pattern-violation]`
`tools/traceability-enforcer.py` auto-selects the most-recently-modified `requirements.md`, which is currently `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013 only). The entire portal requirement set (FR-001..FR-069, FR-dependency-\*, FR-DUP-\*, FR-070+) is never validated by the gate. **Fix:** add multi-plan support or a secondary enforcer invocation targeting `Plans/dev-workflow-platform/requirements.md`.

### QO-007 — FR-TMP-008 missing Verifies comment in Dockerfile.worker `[P3 · spec-drift]`
`platform/Dockerfile.worker:32-40` installs `gh` CLI and Playwright/Chromium as required, but has no `# Verifies: FR-TMP-008` annotation. All other FR-TMP requirements are commented. **Fix:** add the comment.

### QO-008 — TeamsPage has no test file `[P3 · untested]`
`portal/Frontend/src/pages/TeamsPage.tsx` is the only portal page without a corresponding test. **Fix:** create `portal/Frontend/tests/TeamsPage.test.tsx`.

### QO-009 — 3 eslint-disable suppressions without justification `[P3 · pattern-violation]`
`DependencyPicker.tsx:82`, `useWorkItems.ts:63`, `portal/Frontend/src/hooks/useApi.ts:35` all suppress `react-hooks/exhaustive-deps` without an inline comment explaining why. **Fix:** add a justification comment to each suppression.

---

**Grading:** 1 P1 disqualifies A and B grades → **C**. No security escalations. All fixes route to **TheFixer** (except QO-001 which routes to **requirements-reviewer**). Full report saved to `Teams/TheInspector/findings/audit-2026-04-23-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
