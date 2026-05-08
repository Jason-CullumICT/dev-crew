---

## Quality Oracle Findings

**Audit date:** 2026-05-08  
**Grade: B** (0 P1s, 2 P2s, 5 P3s — within grading thresholds)

---

### Spec Coverage: ~99% (effective)

| Spec | Requirements | Covered | Gap |
|------|-------------|---------|-----|
| `workflow-engine.md` (FR-WF-*) vs `Source/` | 13 | 13 | 0 |
| `dev-workflow-platform.md` (FR-001–069) vs `portal/` | 69 | 69 | 0 |
| `Plans/dev-cycle-traceability` (FR-050–069) vs `portal/` | 21 | 21 | 0 |
| `Plans/dependency-linking` (FR-dependency-*) vs `portal/` | 7 | 7 | 0 |
| `Plans/duplicate-deprecated-status` (FR-DUP-*) vs `portal/` | 15 | 14 | **1** (FR-DUP-06 comment missing) |
| `Plans/image-upload` (FR-070–095) vs `portal/` | 21 | 21 | 0 |
| `tiered-merge-pipeline.md` (FR-TMP-*) vs `platform/` | 10 | 10 | 0 |

> ⚠️ **The standard `python3 tools/traceability-enforcer.py` gate is blind to portal/ and platform/**. It only scans `Source/` and `E2E/`. See QO-001.

---

### QO-001: Traceability Enforcer Blind Spot — portal/ and platform/ Not Scanned
- **Severity:** P2
- **Category:** spec-drift / tool-gap
- **File:** `tools/traceability-enforcer.py:70`
- **Detail:** The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The `dev-workflow-platform.md` spec (FR-001–FR-069+) is implemented in `portal/`, and `tiered-merge-pipeline.md` (FR-TMP-*) in `platform/orchestrator/`. Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` reports **76 requirements "missing"** — all false negatives. Worse, real traceability gaps in `portal/` or `platform/` are invisible to the gate. Additionally, the default behaviour (most-recently-modified plan) means only one plan's FRs are ever checked at a time; the other 7 plans' requirements are silently ignored each run.
- **Recommendation:** Add `portal` and `platform` to `source_dirs` in `check_traceability()`. Alternatively, add a multi-plan sweep mode that checks each plan against its canonical source directory.
- **Cross-ref:** TheFixer — code change in `tools/traceability-enforcer.py`

---

### QO-002: Architecture Violation — Direct DB Queries in Route Handler
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37–43, 72–75`
- **Detail:** The `teamDispatches` route handler calls `db.prepare(...).all()` and `db.prepare(...).run()` directly — no service layer exists for team dispatch operations. CLAUDE.md explicitly forbids this: *"No direct DB calls from route handlers — use the service layer."* This file was also modified within the last 14 days, making it an active drift concern. The `TeamDispatch` interface (line 14) is defined inline in the route file rather than in `portal/Shared/types.ts`, violating the shared-types rule simultaneously.
- **Recommendation:** Extract a `teamDispatchService.ts` with `listDispatches(db, ...)` and `createDispatch(db, ...)`. Move `TeamDispatch` to `portal/Shared/types.ts`. Add `// Verifies:` traceability comments once a spec entry exists (see QO-004).
- **Cross-ref:** TheFixer

---

### QO-003: Silent Error Swallowing — Three Empty `.catch(() => {})` Blocks
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `portal/Frontend/src/components/bugs/BugDetail.tsx:82`
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`
  - `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- **Detail:** All three use `.catch(() => {})` which silently discards failures. CLAUDE.md: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* Users will see stale UI state with no error message when these API calls fail.
- **Recommendation:** Replace with `catch((err) => { logger.error('...', err); })` at minimum, or surface an error toast to the user. If the silence is intentional (e.g., best-effort background refresh), add a comment: `// intentionally ignored — non-critical prefetch`.
- **Cross-ref:** TheFixer

---

### QO-004: Unlinked Implementations — Three Production Files with Zero Verifies Comments
- **Severity:** P3
- **Category:** spec-drift
- **Files:**
  - `portal/Backend/src/routes/teamDispatches.ts` *(recently added, last 14 days)*
  - `portal/Frontend/src/components/common/RepoSelector.tsx`
  - `portal/Frontend/src/pages/TeamsPage.tsx`
- **Detail:** These source files contain production logic with no `// Verifies: FR-XXX` comments. `teamDispatches.ts` was recently added — it provides a `GET/POST /api/team-dispatches` API. There is no corresponding entry in any spec or plan file, meaning this entire feature has been built without a specification. `RepoSelector` and `TeamsPage` implement UI for team dispatch management but are similarly unspecified.
- **Recommendation:** Write spec entries in `Plans/` (or `Specifications/`) for the team-dispatches API and the Teams page. Then backfill `// Verifies:` comments. This is scope creep that should be codified.
- **Cross-ref:** requirements-reviewer (spec authoring needed)

---

### QO-005: Missing Traceability Comment for FR-DUP-06
- **Severity:** P3
- **Category:** spec-drift
- **File:** `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/routes/featureRequests.ts`
- **Detail:** FR-DUP-06 states *"Detail endpoints always return the full item regardless of status"*. No `// Verifies: FR-DUP-06` comment exists anywhere in the codebase. The functional behavior likely exists (bug and FR detail routes do not filter by status), but it is untraced. This means the traceability enforcer cannot confirm the requirement is covered.
- **Recommendation:** Add `// Verifies: FR-DUP-06` to the relevant `router.get('/:id', ...)` handlers in `bugs.ts` and `featureRequests.ts`.
- **Cross-ref:** TheFixer (trivial — comment addition only)

---

### QO-006: Inline Type Definition Violates Shared-Types Rule
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:14–22`
- **Detail:** `interface TeamDispatch { id, team, inputs, dispatched_at, actions_url, workflow, repo }` is defined locally inside a route file. CLAUDE.md: *"Shared types are single source of truth — no inline type re-definitions across layers."* If any future frontend code needs to type team-dispatch responses, it will re-define this or import directly from a route file.
- **Recommendation:** Move to `portal/Shared/types.ts` and import from there.
- **Cross-ref:** TheFixer (part of QO-002 refactor)

---

### QO-007: FR-070 to FR-095 Live Only in Plans — Not Backported to Specifications/
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical specification `Specifications/dev-workflow-platform.md` ends at FR-069. Requirements FR-070–FR-095 (image upload: FR-070–FR-079; orchestrator dashboard: FR-080–FR-095) and all FR-DUP-* entries exist only in `Plans/image-upload/requirements.md`, `Plans/orchestrator-cycle-dashboard/requirements.md`, and `Plans/duplicate-deprecated-status/requirements.md`. The spec document has effectively drifted behind implementation by ~26 FRs and multiple feature-plane additions. Any external reader of the spec gets an incomplete view of the system.
- **Recommendation:** Append FR-070–FR-095 and the FR-DUP-* table to `Specifications/dev-workflow-platform.md`. This is a documentation task, not a code change.
- **Cross-ref:** requirements-reviewer

---

### QO-008: eslint-disable Suppressions in Source/Frontend
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. While these suppressions are common, they can hide stale-closure bugs. Each should have a comment explaining *why* the dep is intentionally omitted.
- **Recommendation:** Add inline comment explaining the intent: `// deps intentionally omitted — ...`

---

### QO-009: Five Production Source Files Exceed 500-Line Threshold
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — 550 lines
  - `portal/Frontend/src/components/bugs/BugDetail.tsx` — 546 lines
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Frontend/src/api/client.ts` — 525 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
- **Detail:** Large files increase cognitive load and merge-conflict surface. Not an immediate bug risk.
- **Recommendation:** Consider extracting sub-components from the detail views (e.g., separate DependencySection, FeedbackLog panels). `cycleService.ts` could split pipeline lifecycle from ticket management.

---

### QO-010: FR-TMP-008 Lacks Verifies Comment in Dockerfile.worker
- **Severity:** P4
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:32–40`
- **Detail:** FR-TMP-008 ("Worker Container Prerequisites — gh CLI + Playwright") is implemented in Dockerfile.worker, but the enforcer doesn't scan Dockerfiles and there's no companion test verifying the tooling is present.
- **Recommendation:** Add a `# Verifies: FR-TMP-008` comment in Dockerfile.worker. Optionally add a smoke test that verifies `gh --version` and `playwright --version` succeed inside the container.

---

```json
{
  "audit_date": "2026-05-08",
  "grade": "B",
  "spec_coverage_pct": 99,
  "total_requirements_tracked": 156,
  "requirements_missing_verifies": 1,
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift/tool-gap",       "title": "Enforcer blind spot: portal/ and platform/ not scanned"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation",    "title": "Direct DB queries in teamDispatches route handler"},
    {"id": "QO-003", "severity": "P3", "category": "pattern-violation",         "title": "3 empty .catch(() => {}) blocks swallow errors silently"},
    {"id": "QO-004", "severity": "P3", "category": "spec-drift",                "title": "3 production files with zero Verifies comments"},
    {"id": "QO-005", "severity": "P3", "category": "spec-drift",                "title": "FR-DUP-06 has no Verifies comment"},
    {"id": "QO-006", "severity": "P3", "category": "architecture-violation",    "title": "Inline TeamDispatch type in route file"},
    {"id": "QO-007", "severity": "P3", "category": "doc-stale",                 "title": "FR-070 to FR-095 not backported to Specifications/"},
    {"id": "QO-008", "severity": "P4", "category": "pattern-violation",         "title": "2 eslint-disable suppressions in Source/Frontend"},
    {"id": "QO-009", "severity": "P4", "category": "pattern-violation",         "title": "5 source files exceed 500 lines"},
    {"id": "QO-010", "severity": "P4", "category": "spec-drift",                "title": "FR-TMP-008 lacks Verifies comment in Dockerfile.worker"}
  ],
  "re_verification": "first_run_no_prior_findings",
  "escalations": []
}
```

---

**Learnings file updated:** `Teams/TheInspector/learnings/quality-oracle.md`

---

### Key Takeaways

**The single most impactful fix** is **QO-001** — adding `portal` and `platform` to the traceability enforcer's scan dirs. Right now the verification gate is effectively blind to two of the three application codebases. A one-line change to `tools/traceability-enforcer.py:70` fixes it.

**The only genuine architecture violation in active code** is **QO-002** — `teamDispatches.ts` bypasses the service layer and sneaked in without a spec entry (QO-004). These two findings are coupled and should be fixed together by TheFixer.

**Overall the codebase is in good health**: traceability coverage is excellent where the enforcer can see it, the service-layer pattern is respected everywhere except the one new file, and no hardcoded secrets were found.
