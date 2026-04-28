---

## Quality Oracle Findings — 2026-04-28

### Spec Coverage: ~55% overall (gated: 100% | ungated: 0%)

The project has three specs targeting three layers — but the traceability enforcer only gates one of them.

| Spec | FRs | Layer | Gate? | Coverage |
|------|-----|-------|-------|----------|
| `workflow-engine.md` | 13 FR-WF-* | `Source/` | ✅ | **100%** |
| `dev-workflow-platform.md` | ~85 FR-* | `portal/` | ❌ | ~96% (manual) |
| `tiered-merge-pipeline.md` | 10 FR-TMP-* | `platform/orchestrator/` | ❌ | ~40% |

---

### QO-001 — `GET /api/search` Not Wired *(5 tests failing)*
- **Severity:** P1 | **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (missing mount) + `Source/Backend/tests/routes/search.test.ts`
- **Detail:** `FR-dependency-search` requires the cross-entity search endpoint used by the DependencyPicker typeahead. The test file itself documents the gap: *"this endpoint is NOT wired into app.ts."* All 5 tests return 404. The `DependencyPicker` component calls `/api/search` — without it, users cannot search for items to link as blockers.
- **Fix:** Add `app.get('/api/search', ...)` mounting in `app.ts` (or extract a search route file). The logic is trivially: `store.getAllItems().filter(i => i.title/description.includes(q))`.
- **Route to:** TheFixer

---

### QO-002 — Traceability Enforcer Blind to 95+ Requirements
- **Severity:** P2 | **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** The enforcer scans `Plans/` for the most-recently-modified `requirements.md` and checks only those 13 FRs. It never reads `Specifications/*.md`. The result: `TRACEABILITY PASSED` while ~95 spec requirements (portal + pipeline) have zero automated coverage. The config in `inspector.config.yml` sets `specs.dir: Specifications/` but the enforcer ignores this.
- **Fix:** Extend enforcer (or add separate calls in CLAUDE.md verification gates) to check Specifications/*.md against their respective implementation dirs.
- **Route to:** TheFixer

---

### QO-003 — `dependencyCheckDuration` Histogram Missing
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** FR-dependency-metrics specifies **4 instruments**: 3 counters ✅ + 1 histogram ❌. The `dependencyCheckDuration` histogram is absent from both the implementation and the metrics test. SLO monitoring for dependency check latency cannot be established.
- **Fix:** Add `new Histogram({name: 'dependency_check_duration_seconds', ...})` and instrument `isReady()`/`computeHasUnresolvedBlockers()` calls. Add test in `metrics.test.ts`.
- **Route to:** TheFixer

---

### QO-004 — Portal Shared Types Missing `blocked_by` Field
- **Severity:** P2 | **Category:** spec-drift
- **File:** `portal/Shared/api.ts:32-38, 59-67`
- **Detail:** FR-dependency-api-types requires `blocked_by?: string[]` in `UpdateBugInput` and `UpdateFeatureRequestInput`. Both interfaces lack this field, forcing `DependencyPicker.tsx` to use `as any` casts. Violates the "Shared types are single source of truth" rule.
- **Route to:** TheFixer

---

### QO-005 — Portal Seed Data Not Created
- **Severity:** P2 | **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (missing `seed.ts`)
- **Detail:** FR-dependency-seed specifies an idempotent seed function (BUG-0010 blocked_by 5 bugs; 3 FR blockers). The database directory has `schema.ts` and `connection.ts` but no `seed.ts`. The dependency feature cannot be demonstrated on a fresh portal startup.
- **Route to:** TheFixer

---

### QO-006 — Portal Dependency Frontend Tests Missing
- **Severity:** P2 | **Category:** untested
- **File:** `portal/Frontend/tests/` (missing `DependencySection.test.tsx`, `BlockedBadge.test.tsx`)
- **Detail:** FR-dependency-frontend-tests requires test files for both components. `DependencyPicker.test.tsx` exists (321 lines) but the Section (226 lines) and Badge (70 lines) components have zero test coverage despite being integrated into production detail and list views.
- **Route to:** TheFixer

---

### QO-007 — Dual Logger Abstraction *(P3)*
- **File:** `Source/Backend/src/logger.ts` wraps `src/utils/logger.ts` with a different call signature
- **Detail:** Routes call `logger.info({ msg: '...', key: val })` (object form); the store calls `logger.info('...', { key: val })` (string+ctx form). Both work via the wrapper, but create inconsistent patterns. CLAUDE.md says "use the project's logger abstraction" — with two abstractions this is ambiguous.

### QO-008 — `eslint-disable` Without Explanation *(P3)*
- **Files:** `DependencyPicker.tsx:82`, `useWorkItems.ts:63`
- **Detail:** Two `react-hooks/exhaustive-deps` suppressions with no comment explaining why the dependency is intentionally omitted. May mask stale-closure bugs.

### QO-009 — DebugPortalPage Free-text Verifies Comment *(P4)*
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** `// Verifies: dev-crew debug portal — embedded container-test viewer` is not FR-XXX format and won't be matched by the enforcer.

---

**Findings written to:** `Teams/TheInspector/findings/audit-2026-04-28-C.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`

**Immediate action:** QO-001 (search route) is the only blocking P1 — 5 tests are red in CI. Fixing it requires ~10 lines in `app.ts` or a dedicated search route file, and immediately restores the `DependencyPicker` typeahead. Route to **TheFixer**.
