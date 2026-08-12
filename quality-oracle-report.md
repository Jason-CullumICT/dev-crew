---

## Quality Oracle Findings — 2026-08-12

### Spec Coverage

| Spec | FRs | Source/ Coverage |
|------|-----|-----------------|
| `Plans/self-judging-workflow` | 13 FR-WF-* | **100%** ✅ (enforcer: PASSED) |
| `Specifications/dev-workflow-platform.md` | 69 FR-001–069 | **0%** ⚠️ (product lives in `portal/`) |
| `Specifications/tiered-merge-pipeline.md` | 10 FR-TMP-* | **0%** ⚠️ (product lives in `platform/`) |
| `Plans/dependency-linking` | ~14 FR-dependency-* | **~93%** ✅ |

---

### Findings (ranked by severity)

#### QO-001 — P1 · spec-drift
**Traceability enforcer blind to 7 of 8 active plans**
`tools/traceability-enforcer.py:49-57`

The enforcer's auto-fallback picks the **most recently modified** `requirements.md`. With 8 plans in `Plans/`, only `self-judging-workflow` (13 IDs) is checked per run. `Plans/dev-workflow-platform/requirements.md` alone has **103 FR IDs** — all silently skipped. `python3 tools/traceability-enforcer.py` returning PASSED is a false green. Fix: iterate all active plans, or add an explicit `plans.active` list to `inspector.config.yml`.

---

#### QO-002 — P2 · architecture-violation
**Direct store access from route handlers**
`routes/workItems.ts`, `routes/intake.ts`, `routes/workflow.ts`

Three route files call `store.*` directly (6+ locations in workItems.ts, 2 in intake.ts, 4 in workflow.ts). CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* Only workflow actions (route, assess, dispatch) go through services; all CRUD and intake paths are unmediated. **→ TheFixer / backend-coder.**

---

#### QO-003 — P2 · architecture-violation
**Logger lacks NODE_ENV-aware formatting**
`Source/Backend/src/utils/logger.ts`

Always emits JSON regardless of environment. CLAUDE.md: *"structured JSON in production, pretty-printing in development."* `LOG_LEVEL` env var documented in CLAUDE.md but never read by the logger. Also: `src/logger.ts` is a compat shim wrapping `utils/logger.ts` — two interfaces for one logger. Fix: add NODE_ENV check, honour LOG_LEVEL, consolidate to one entry point.

---

#### QO-004 — P2 · spec-drift
**OpenTelemetry tracing not implemented**
`Source/Backend/package.json`, `src/app.ts`

FR-WF-013 AC: *"Trace/span IDs appear in logs; traceparent header forwarded."* CLAUDE.md: *"Use OpenTelemetry for distributed tracing; propagate W3C traceparent header."* No `@opentelemetry` packages in package.json. No spans, no traceId/spanId in log output, no traceparent header handling. **→ TheFixer / backend-coder.**

---

#### QO-005 — P2 · spec-drift
**Domain spec FR-001 to FR-069 orphaned from Source/**
`Specifications/dev-workflow-platform.md`

The canonical spec's 69 FRs describe a SQLite-backed product (feature requests, bugs, dev cycles). Zero `// Verifies: FR-XXX` comments for these IDs exist in `Source/`. The product **is** implemented — in `portal/`, which CLAUDE.md describes only as "Debug portal UI." Either the domain spec or the CLAUDE.md module table needs updating to reflect the actual product split. This is a structural misalignment, not a coding gap.

---

#### QO-006 — P3 · pattern-violation
**Duplicate logger abstraction**
`src/logger.ts` wraps `src/utils/logger.ts`

Compat shim created for "backend-coder-2's routes" — now permanent. Two logger interfaces, one log sink. Consolidate into `utils/logger.ts` with a unified signature and delete the shim.

---

#### QO-007 — P3 · doc-stale
**Dependency-linking plan Implementation Delta is stale**
`Plans/dependency-linking/requirements.md`

Delta marks `FR-dependency-frontend-tests` as ❌ Missing, but `DependencySection.test.tsx` (172 lines) and `BlockedBadge.test.tsx` (27 lines) both exist with Verifies comments. The other two missing items (`FR-dependency-api-types`, `FR-dependency-seed`) reference `portal/` paths — unclear status for `Source/`. Remove or automate the delta section.

---

#### QO-008 — P3 · pattern-violation
**Two eslint-disable suppressions in production**
`hooks/useWorkItems.ts:63`, `components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` without explanation. Should be resolved with proper dep arrays or a comment explaining why the omission is intentional.

---

**Grade: C** (0 P1 code issues, 4 P2s, 3 P3s; QO-001 is a tooling gap, not a code defect). Full findings written to `Teams/TheInspector/findings/quality-oracle-2026-08-12.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
