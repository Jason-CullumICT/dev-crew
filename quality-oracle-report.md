---

## Quality Oracle Findings

**Overall Grade: B** — No P1s, 5 P2s, 3 P3s, 2 P4s. Spec coverage ~82%.

---

### Spec Coverage: ~82%
- **71 total requirements** across 4 specs/plans
- **58 traced** (13 Source/FR-WF-*, ~32 portal/FR-001–032, 13 portal/FR-dependency-*)
- **13 untraced or enforcer-blind** (10 FR-TMP-* in platform/, 3 open dependency gaps)

---

### QO-001 · P2 · spec-drift/untested
**`GET /api/search` route missing — 5 tests document the gap but will fail**
`Source/Backend/src/routes/` has no `search.ts` and the endpoint is not mounted in `app.ts`. The test file is self-documenting ("will FAIL until route is implemented"), but the traceability enforcer **passes** because it finds the `// Verifies:` comment in the test file. False positive in the gate.
→ **Fix:** Implement the search route in Source/Backend; route to TheFixer.

---

### QO-002 · P2 · architecture-violation
**Traceability enforcer never scans `portal/` or `platform/`**
The enforcer hardcodes `["Source", "E2E"]`. The `portal/` directory holds 30 test files and 1,068 `// Verifies:` comments implementing FR-001–069, but none are gate-validated. Drift in portal traces would pass all CI checks silently.
→ **Fix:** Extend enforcer scan dirs to include `portal/`; update `inspector.config.yml` accordingly.

---

### QO-003 · P2 · tooling
**Enforcer false-failure on `--plan dependency-linking` (spurious FR-ID pattern matches)**
The regex `FR-[A-Z0-9-]+` grabs seed-data references embedded in prose ("BUG-0010 blocked_by FR-0003") and spec cross-references ("FR-070 — FR-085"), producing 7 phantom missing requirements. The actual `FR-dependency-*` IDs all exist in source.
→ **Fix:** Tighten the extraction regex to table-column context only.

---

### QO-004 · P2 · spec-drift
**3 open gaps from dependency-linking plan delta (self-documented)**
The plan's own implementation delta table shows ❌ for:
1. `FR-dependency-api-types` — `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by`; frontend uses `as any` casts
2. `FR-dependency-seed` — `portal/Backend/src/database/seed.ts` doesn't exist
3. `FR-dependency-frontend-tests` — `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing
→ **Fix:** Route to TheFixer; the plan already has exact implementation instructions.

---

### QO-005 · P2 · spec-drift
**`Specifications/tiered-merge-pipeline.md` has zero enforced traceability**
FR-TMP-001 through FR-TMP-010 (risk classification, E2E generation, auto-PR, AI review, auto-merge) are implemented in `platform/` with no `// Verifies:` comments and no enforcer coverage.
→ **Fix:** Either add traces to platform/ and extend enforcer, or formally document platform/ as spec-exempt in CLAUDE.md.

---

### QO-006 · P3 · pattern-violation
**Dual logger abstraction in Source/Backend** — `src/logger.ts` (compat wrapper) + `src/utils/logger.ts` (canonical). DRY violation with two valid import paths for a single concern.

### QO-007 · P3 · pattern-violation
**2 `eslint-disable` suppressions** (`DependencyPicker.tsx:82`, `useWorkItems.ts:63`) both hide `react-hooks/exhaustive-deps` — potential stale closure bugs.

### QO-008 · P3 · spec-drift
**Portal uses non-canonical FR-dependency-* IDs** (`FR-dependency-linking` vs plan's `FR-dependency-service`). Cannot cross-reference portal traces against the plan table.

### QO-009 · P4 · untested
**7 Source/Frontend files lack test files**: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`, `useDashboard.ts`, `useWorkItems.ts` — all recently modified.

### QO-010 · P4 · tooling
**Enforcer default mode targets most-recently-modified `requirements.md`** — agents could validate the wrong plan silently. CLAUDE.md verification gate says to run without `--plan`.

---

Full report: `Teams/TheInspector/findings/audit-2026-04-15-B.md`
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
