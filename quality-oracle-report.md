## Quality Oracle Findings — 2026-07-29

### Spec Coverage: ~97%
- **112 requirements** across 4 spec documents
- **~109 traced** to source code (Source/, portal/, platform/orchestrator/)
- **3 untraced/unconfirmed**: FR-TMP-005, FR-TMP-006 (unverified), + `GET /api/search` unwired

> ⚠️ **Important context**: the project has three distinct source trees (`Source/`, `portal/`, `platform/orchestrator/`) implementing different specs. The traceability enforcer only scans `Source/` — the gate passing gives false confidence about the other two apps.

---

### QO-001 · P1 · spec-drift — `GET /api/search` not wired (failing tests)
**File:** `Source/Backend/src/app.ts`

`FR-dependency-search` requires a cross-entity search endpoint. `Source/Backend/tests/routes/search.test.ts` explicitly documents: *"the GET /api/search endpoint is NOT wired into app.ts… these tests will FAIL until the route is implemented."* All 5 tests return 404 today.

**Fix:** Register the `/api/search` route in `app.ts`. → TheFixer

---

### QO-002 · P2 · architecture-violation — Enforcer blindspot: portal/ and platform/ excluded
**File:** `tools/traceability-enforcer.py:80`

`source_dirs = ["Source", "E2E"]` is hardcoded, completely missing:
- `portal/` — 1,073 `Verifies:` comments, FR-001 through FR-095
- `platform/orchestrator/` — FR-TMP-001 through FR-TMP-010

Running the default gate against `Plans/dev-workflow-platform/requirements.md` reports **34 MISSING** even though all are implemented. The gate is structurally broken for 2/3 of the codebase.

**Fix:** Extend `source_dirs` to include `portal/` and `platform/`, ideally driven by `inspector.config.yml`'s `source.dirs`. → TheFixer

---

### QO-003 · P2 · architecture-violation — Routes bypass service layer (3 files)
**Files:** `Source/Backend/src/routes/workItems.ts:44`, `workflow.ts`, `intake.ts`

All three call `store.*` methods directly from route handlers — 14+ call sites total. CLAUDE.md is explicit: *"No direct DB calls from route handlers — use the service layer."* Service files (`assessment.ts`, `router.ts`, `changeHistory.ts`) exist and show the correct pattern.

**Fix:** Extract store interactions in the three route files into service functions. → TheFixer

---

### QO-004 · P2 · spec-drift — FR-TMP-001..010 outside enforcer scope
**File:** `tools/traceability-enforcer.py`

10 requirements in `Specifications/tiered-merge-pipeline.md` are implemented in `platform/orchestrator/` but never scanned. FR-TMP-005 (AI PR Review) and FR-TMP-006 (Auto-Merge Logic) were not confirmed traced via `Verifies:` comments.

**Fix:** Covered by QO-002 fix + spot-verify FR-TMP-005/006 traceability.

---

### QO-005 · P3 · spec-drift — `dependencyCheckDuration` histogram absent from Source/Backend
**File:** `Source/Backend/src/metrics.ts:40`

FR-dependency-metrics requires 4 metrics. The file implements 3 counters and claims `// Verifies: FR-dependency-metrics` without the histogram. (The histogram is correctly present in `portal/Backend/src/metrics.ts`.)

---

### QO-006 · P3 · architecture-violation — Logger always emits JSON; no dev pretty-print
**File:** `Source/Backend/src/utils/logger.ts:24`

CLAUDE.md + FR-003 require pretty-printing in development. `process.stdout.write(JSON.stringify(entry))` is unconditional — no `NODE_ENV` branch.

---

### QO-007 · P3 · pattern-violation — Two logger files, different call signatures
**Files:** `Source/Backend/src/logger.ts` and `src/utils/logger.ts`

Both export a `logger`, but with incompatible signatures. Object-first calls to `utils/logger.ts` silently produce `'[object Object]'` as the message. Routes import from both paths.

---

### QO-008 · P4 · pattern-violation — `eslint-disable` without justification
**Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `DependencyPicker.tsx:82`

`react-hooks/exhaustive-deps` suppressed with no explanation. Add a one-line comment documenting the intentional omission.

---

**Grade: B** — 1 P1 (failing tests), 3 P2 (structural debt), no exploitable security issues. Full report saved to `Teams/TheInspector/findings/quality-oracle-2026-07-29.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
