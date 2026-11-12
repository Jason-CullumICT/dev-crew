## Quality Oracle Findings — 2026-11-12

### Spec Coverage: **26%** (29 of 111 FRs traced)
**Grade: D** — 2 P1 findings; spec coverage below 40% threshold for grade C

> **False positive alert:** `python3 tools/traceability-enforcer.py` reports `TRACEABILITY PASSED` — but it only checks 13 of 111 FRs. See QO-002.

---

### QO-001 — Route Handlers Bypass the Service Layer *(P1 · architecture-violation)*

**Files:** `Source/Backend/src/routes/workflow.ts` (12 hits), `workItems.ts` (6 hits), `intake.ts` (2 hits)

All three route modules `import * as store from '../store/workItemStore'` and call `findById`, `createWorkItem`, `updateWorkItem`, `findAll` directly inside HTTP handlers. CLAUDE.md's non-negotiable rule: *"No direct DB calls from route handlers — use the service layer."* The in-memory store is the DB-equivalent. Correctly-architected routes exist (`dashboard.ts` → `services/dashboard.ts`), but three of four route modules violate the pattern.

**Recommendation:** Create a `WorkItemService` and move all store calls there. Routes should do: parse → call service → respond.

---

### QO-002 — Traceability Enforcer is Blind to 98 of 111 FRs *(P1 · spec-drift)*

**File:** `tools/traceability-enforcer.py:56` (`max(req_files, key=os.path.getmtime)`)

The enforcer auto-picks the **most recently modified** `requirements.md` only. Right now that's `Plans/self-judging-workflow/requirements.md` (13 FRs → PASS). Never checked:

| Plan/Spec | Enforcer result if checked |
|---|---|
| `Plans/dependency-linking/requirements.md` | **FAIL — 7 missing** (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) |
| `Specifications/dev-workflow-platform.md` | **FAIL — 69 missing** (FR-001 to FR-069) |
| `Specifications/tiered-merge-pipeline.md` | **FAIL — 13 missing** (FR-TMP-001 to FR-TMP-010, FR-1 to FR-3) |

**Recommendation:** Run enforcer explicitly per plan in CI (`--file Plans/X/requirements.md`) or add an `--all-plans` mode. Mark inactive plans as `Status: ARCHIVED` so they're excluded.

---

### QO-003 — dev-workflow-platform.md Spec Describes an App That Isn't Built *(P2 · spec-drift)*

**File:** `Specifications/dev-workflow-platform.md` (FR-001 to FR-069)

The primary domain spec defines SQLite, `FeatureRequest`, `BugReport`, `DevelopmentCycle`, `Ticket` entities and 7 subsystems. Source/ implements a `WorkItem`-based in-memory workflow engine — an entirely different data model. Zero Verifies: comments for 69 FRs. CLAUDE.md: *"Specs are source of truth — implementation traces to specs, never the other way around."*

**Recommendation:** Update this spec to describe what Source/ actually builds, or archive it as the portal/predecessor spec and create a new authoritative spec for the WorkItem engine.

---

### QO-004 — tiered-merge-pipeline.md 13 FRs Have No Implementation and No Status *(P2 · spec-drift)*

**File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010, FR-1 to FR-3)

Risk classification, Playwright test generation, auto-PR, AI PR review, auto-merge — none implemented in Source/. No git history of implementation. Status unknown (planned? abandoned?).

**Recommendation:** Add `Status: PLANNED | DEFERRED | ABANDONED` to the spec header.

---

### QO-005 — dependency-linking Plan References Non-Existent portal/ Paths *(P2 · spec-drift)*

**File:** `Plans/dependency-linking/requirements.md`

All requirements reference `portal/Backend`, `portal/Frontend`, `portal/Shared/` — paths not in this repo. Running the enforcer against this plan fails with 7 missing FRs. The dependency feature IS implemented (FR-dependency-* Verifies: comments in Source/) but under different IDs than this plan specifies.

**Recommendation:** Add `Status: ARCHIVED (applies to portal/)` to prevent misleading enforcer failures.

---

### QO-006 — eslint-disable Without Explanation in 2 Production Files *(P3 · pattern-violation)*

- `Source/Frontend/src/hooks/useWorkItems.ts:63`
- `Source/Frontend/src/components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` with no comment explaining why the dep is intentionally omitted. Risk: stale closures.

---

### QO-007 — Hardcoded localhost:4200 Portal URL *(P3 · pattern-violation)*

**File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`

`'http://localhost:4200'` as the env var fallback will silently render a broken iframe in any deployed environment.

---

### Pattern Checks (all PASS)
✅ No `console.log` in production source · ✅ No hardcoded secrets · ✅ No empty catch blocks · ✅ No files >500 lines · ✅ No skipped/todo tests · ✅ All 4 Prometheus domain counters wired

---

**Report:** `Teams/TheInspector/findings/audit-2026-11-12-D.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
**Escalations:** None to TheGuardians (no auth/injection/secrets findings).
**Route to TheFixer:** QO-001 (route refactor), QO-006 (eslint-disable comments).
**Route to requirements-reviewer:** QO-003, QO-004, QO-005 (spec updates/archival).
