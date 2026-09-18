## Quality Oracle Audit — 2026-09-18

---

## Spec Coverage: **96%** (active plans) — Grade: **B**

27 of 28 active-plan requirements are traced in source. 1 P1 gap pulls the grade below A.

---

## Findings (8 total: 1 P1, 4 P2, 3 P3)

### QO-001 · P1 — `GET /api/search` is unregistered — DependencyPicker broken in production
**File:** `Source/Backend/src/app.ts`  
`FR-dependency-search` requires a cross-entity search endpoint. The route test (`Source/Backend/tests/routes/search.test.ts`) explicitly documents:  
> *"these tests will FAIL until the route is implemented"*  
There is no `search.ts` in `Source/Backend/src/routes/` and `app.ts` has no `/api/search` registration. The `DependencyPicker` component calls `/api/search` and receives a 404 in production. **Fix:** create the route file and register it in `app.ts`.

---

### QO-002 · P2 — `dependencyCheckDuration` histogram missing from Source Backend
**File:** `Source/Backend/src/metrics.ts`  
`FR-dependency-metrics` requires 4 Prometheus metrics. Source Backend exports 3 (3 counters); the `dependencyCheckDuration` histogram is absent. The portal backend has it correctly. The Source dependency service never starts a timer. **Fix:** add the histogram, wire it around readiness/cascade calls.

---

### QO-003 · P2 — `Specifications/` covers two architecturally distinct apps with no labeling
`workflow-engine.md` → `Source/`, `dev-workflow-platform.md` → `portal/`, `tiered-merge-pipeline.md` → `platform/`. No spec carries an "Applies to:" annotation, causing namespace collision (FR-001–069 in portal spec vs FR-WF-* in Source) and false positives in the traceability enforcer. **Fix:** add "Applies to:" header to each spec; map it in `CLAUDE.md`.

---

### QO-004 · P2 — Enforcer auto-selects wrong plan; `dependency-linking` requirements never gate-checked
**File:** `tools/traceability-enforcer.py`  
Default run picks `Plans/self-judging-workflow/` (most recent) and PASSES. The `dependency-linking` plan, when explicitly targeted, FAILS (7 missing IDs — 5 are false positives from entity IDs in prose, 2 are real: FR-070, FR-085). `CLAUDE.md` verification gates don't name a plan, so agents never check the dependency plan. **Fix:** enumerate both `--plan` targets in `CLAUDE.md`; fix the false-positive ID matching.

---

### QO-005 · P2 — FR-TMP-001–010 (Tiered Merge Pipeline) have zero source traceability
`Source/E2E/playwright.pipeline.config.ts` was recently modified but has no `// Verifies: FR-TMP-003` comment and all 10 FR-TMP requirements are untraced in `Source/`. Unclear if implemented in `platform/` (enforcer doesn't scan it) or not yet implemented.

---

### QO-006 · P3 — `playwright.pipeline.config.ts` hardcodes expired cycle directory
**File:** `Source/E2E/playwright.pipeline.config.ts:3`  
`testDir: "./tests/cycle-run-1774659927912-8dd3ac77"` — a specific auto-generated directory that no longer exists. Every pipeline E2E run using this config fails at test discovery.

---

### QO-007 · P3 — Duplicate test files for WorkItemListPage and WorkItemDetailPage
Four test files covering two pages (286-line + 262-line for List; two ~21/22 describe-block files for Detail). Divergent coverage is invisible to CI. **Fix:** merge to `Source/Frontend/tests/pages/` and delete root-level duplicates.

---

### QO-008 · P3 — `eslint-disable-next-line` suppressions without rationale
`Source/Frontend/src/hooks/useWorkItems.ts:63` and `Source/Frontend/src/components/DependencyPicker.tsx:82` suppress `react-hooks/exhaustive-deps` with no explanation. Architecture requires all suppressions to document intent.

---

**Report saved:** `Teams/TheInspector/findings/audit-2026-09-18-quality-oracle.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
