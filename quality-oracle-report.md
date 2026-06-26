Now the full audit report:

---

## Quality Oracle Findings
**Project:** dev-crew (Self-Judging Workflow Engine + Dev-Workflow Platform Portal + Tiered-Merge Pipeline)
**Date:** 2026-06-26
**Grade: B**

---

### ⚠️ Architecture Reality Check — Three Systems, One Inspector Config

Before the findings: this repo has **three distinct implementation areas** that the current `inspector.config.yml` only partially covers:

| Area | Spec | FR namespace | Tests |
|------|------|-------------|-------|
| `Source/` | `workflow-engine.md` | `FR-WF-001–013`, `FR-dependency-*` | 14 test files, all with `// Verifies:` |
| `portal/` | `dev-workflow-platform.md` (FR-001→FR-095) | `FR-001–095` | 15 test files, **480** `// Verifies:` comments |
| `platform/orchestrator/` | `tiered-merge-pipeline.md` | `FR-TMP-001–010` | `workflow-engine.test.js` |

The inspector config points only at `Source/`. All analysis below covers all three areas.

---

### Spec Coverage: 11% enforcer-verified / ~96% actual

- **~120** requirement IDs defined across all Plans
- **13** verified by `tools/traceability-enforcer.py` (enforcer only scans one plan)
- **~117** have `// Verifies:` references in source (confirmed by direct grep)
- **6** implemented (FR-090 to FR-095) with no corresponding requirements.md entry
- **1** specified (FR-TMP-008) with no `// Verifies:` reference

The enforcer prints **TRACEABILITY PASSED** — but only because it reads 13 of the 120 requirements.

---

### QO-001 — Traceability Enforcer Covers Only 11% of Requirements
- **Severity:** P2
- **Category:** spec-drift / tooling
- **File:** `tools/traceability-enforcer.py` + `Plans/self-judging-workflow/requirements.md`
- **Detail:** The enforcer uses "most recently modified requirements.md" as its target. In this multi-plan repo that resolves to `Plans/self-judging-workflow/requirements.md` — 13 FR-WF-* entries. It never checks `Plans/dev-workflow-platform/`, `Plans/orchestrated-dev-cycles/`, `Plans/dev-cycle-traceability/`, `Plans/image-upload/`, `Plans/orchestrator-cycle-dashboard/`, `Plans/dependency-linking/`, or `Plans/duplicate-deprecated-status/`. The entire `portal/` and `platform/` implementations are outside the scan. A CI gate that reports "PASSED" with only 11% visibility is a false confidence signal.
- **Recommendation:** Modify enforcer to iterate all `Plans/*/requirements.md` files in one invocation. Add `portal/` and `platform/` to its scan paths. Update `inspector.config.yml` `source.dirs` to include `portal/` and `platform/`.
- **Cross-ref:** QO-003 (unspecified FR-090-095 would surface if enforcer checked portal), QO-006 (inspector config scope)

---

### QO-002 — Portal Routes Call `getDb()` Directly — Architecture Violation
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `portal/Backend/src/routes/bugs.ts`, `cycles.ts`, `featureRequests.ts`, `features.ts`, `learnings.ts`, `pipelines.ts`, `search.ts`, `teamDispatches.ts`, `dashboard.ts` — **51 occurrences**
- **Detail:** Every portal route handler calls `const db = getDb()` and passes it into service functions. Example from `bugs.ts:38`:
  ```ts
  const db = getDb();
  const bugs = listBugs(db, { status, severity });
  ```
  The service functions accept `db` as a first parameter (dependency injection), but the CLAUDE.md rule is categorical: *"No direct DB calls from route handlers — use the service layer."* Route handlers should be unaware of the database layer entirely. Service functions should call `getDb()` internally. As-is, the DB connection lifecycle is controlled by the HTTP layer, not the service layer — making services harder to test in isolation and tying connection management to request scope.
- **Recommendation:** Move `getDb()` calls into each service function. Route handlers should call `listBugs({ status, severity })` with no `db` argument. This is a refactor across ~9 route files and ~8 service files in `portal/Backend/`.
- **Cross-ref:** [ESCALATE → TheFixer] for the refactor

---

### QO-003 — FR-090 to FR-095 Implemented Without Spec Entries
- **Severity:** P2
- **Category:** spec-drift (implementation exceeds spec)
- **Files:**
  - `portal/Frontend/src/components/orchestrator/types.ts` — `// Verifies: FR-090` (5 occurrences)
  - `portal/Frontend/src/components/orchestrator/RunsTab.tsx` — `// Verifies: FR-091, FR-093, FR-094, FR-095`
  - `portal/Frontend/src/components/orchestrator/RunDetailRow.tsx` — `// Verifies: FR-092`
  - `portal/Frontend/src/api/client.ts:457` — `// Verifies: FR-090`
- **Detail:** These FRs cover the orchestrator run-detail UI (shared types for `RunData`, `PhaseResult`, `E2EResult`, PR info; API client functions; `RunsTab` and `RunDetailRow` components). The nearest plan is `Plans/orchestrator-cycle-dashboard/requirements.md` which only defines FR-070 to FR-076. No requirements.md defines FR-090 to FR-095. Per the spec-first rule: *"If the spec doesn't cover it, write the spec first."* These 6 requirements were implemented without a spec.
- **Recommendation:** Write a `Plans/orchestrator-run-detail/requirements.md` that formally defines FR-090 through FR-095 (or extend `Plans/orchestrator-cycle-dashboard/requirements.md`). Then run the traceability enforcer against it.

---

### QO-004 — FR-070 to FR-076 ID Collision Between Two Plans
- **Severity:** P3
- **Category:** spec-drift / traceability ambiguity
- **Files:** `Plans/orchestrator-cycle-dashboard/requirements.md`, `Plans/image-upload/requirements.md`
- **Detail:** Both plans assign FR-070 through FR-076 to entirely different features:
  - `orchestrator-cycle-dashboard`: FR-070 = `OrchestratorCyclesPage`, FR-071 = `CycleCard`, FR-072 = stop button, FR-073 = `CycleLogStream`, FR-074 = `CompletedCyclesSection`, FR-075 = route update, FR-076 = sidebar label
  - `image-upload`: FR-070 through FR-076 = image upload features
  
  Portal's `// Verifies: FR-070` is now ambiguous — it could mean the orchestrator page or an image upload feature. The overlapping namespace prevents an enforcer from validating which plan an implementation satisfies.
- **Recommendation:** Renumber one plan. Suggested: `image-upload` keeps FR-070–089, `orchestrator-cycle-dashboard` moves to FR-090–096 (shifting the current unspecified FR-090-095 up). Update all `// Verifies:` comments in the corresponding portal files. This is primarily documentation work.

---

### QO-005 — FR-TMP-008 Has No `// Verifies:` Traceability
- **Severity:** P3
- **Category:** untested / untraced
- **File:** `platform/` (Dockerfiles, specifically `platform/Dockerfile.worker` or equivalent)
- **Detail:** `tiered-merge-pipeline.md` FR-TMP-008 specifies: *"`gh` CLI installed in worker Docker image (Dockerfile.worker); Playwright installable on demand; `GITHUB_TOKEN` already passed to workers via env."* Every other FR-TMP-* ID (001, 002, 003, 004, 005, 006, 007, 009, 010) has `// Verifies:` comments in `platform/orchestrator/`. FR-TMP-008 is silently untraced. No traceability exists for the Docker build-time prerequisites that the pipeline relies on.
- **Recommendation:** Add `# Verifies: FR-TMP-008` comment to the relevant Dockerfile lines (the `RUN apt-get install gh` stanza and the playwright path ENV). If the Dockerfile doesn't currently install `gh` or configure Playwright paths, that's a gap to fix first.

---

### QO-006 — `inspector.config.yml` Source Scope Misconfigured
- **Severity:** P3
- **Category:** architecture-violation / tooling
- **File:** `Teams/TheInspector/inspector.config.yml:42-47`
- **Detail:** Config declares:
  ```yaml
  source:
    dirs: ["Source/"]
    test_dirs: ["Source/Backend/tests/", "Source/Frontend/tests/"]
  ```
  The production application (`portal/`) and the orchestrator infrastructure (`platform/`) are excluded. All specialist agents that read this config will scope their analysis to the ~20 Source files (workflow engine) and miss the ~80 portal files (the larger system). This causes systematic blind spots across all inspector specialists.
- **Recommendation:** Update config:
  ```yaml
  source:
    dirs: ["Source/", "portal/", "platform/orchestrator/"]
    test_dirs:
      - "Source/Backend/tests/"
      - "Source/Frontend/tests/"
      - "portal/Backend/tests/"
  ```

---

### QO-007 — `eslint-disable` Suppressions in Production Frontend Code
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` — the missing dependency linter rule. While not always a bug, suppressing this rule can hide stale closure bugs that manifest as subtle UI state inconsistencies. Both files were modified in the last 14 days (recently added).
- **Recommendation:** Fix the missing dependencies in the effect/callback deps arrays rather than suppressing. If the dependency is intentionally omitted (e.g., to avoid an infinite loop), document the reasoning with a comment explaining *why* the omission is safe.

---

### QO-008 — Oversized Service Files in Portal Backend
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `portal/Backend/src/services/cycleService.ts` — **526 lines** (threshold: 500)
  - `portal/Backend/src/services/featureRequestService.ts` — **506 lines** (threshold: 500)
- **Detail:** Both exceed the 500-line guideline. `cycleService.ts` at 526 lines handles cycle CRUD, phase transitions, ticket management, CI/CD simulation, and learning/feature creation — multiple responsibilities. `featureRequestService.ts` at 506 lines handles FR CRUD, voting, approval, and denial flows.
- **Recommendation:** Extract `ticketService.ts` from cycle service, and `votingService.ts` already exists — verify FR voting logic isn't duplicated. Each service should own one domain concept.

---

### ✅ Clean Checks — No Violations Found

| Check | Result |
|-------|--------|
| `console.log` in production source (`Source/`, `portal/`) | ✅ None |
| Hardcoded credentials or API secrets | ✅ None (localhost URLs in dev configs only) |
| Empty or swallowed `catch` blocks | ✅ All catch blocks log and respond |
| Direct DB calls in `Source/` backend routes | ✅ None — correct service layer |
| Skipped / TODO tests | ✅ None |
| Missing `// Verifies:` on recently-modified `Source/` files | ✅ All covered (4 config/setup files are legitimately exempt) |
| Inline type re-definitions across layers (shared types violation) | ✅ None found |
| Portal backend tests coverage | ✅ 480 `// Verifies:` across 15 test files |

---

### JSON Summary

```json
{
  "grade": "B",
  "date": "2026-06-26",
  "spec_coverage": {
    "enforcer_verified": "13 / ~120 (~11%)",
    "actual_estimated": "~117 / ~120 (~97%)",
    "unspecified_implemented": ["FR-090", "FR-091", "FR-092", "FR-093", "FR-094", "FR-095"],
    "unimplemented_specified": ["FR-TMP-008 (no Verifies comment — may be implemented)"]
  },
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift/tooling", "title": "Traceability enforcer covers only 11% of requirements"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Portal routes call getDb() directly — 51 occurrences, 9 files", "escalate": "TheFixer"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-090 to FR-095 implemented with no spec entry"},
    {"id": "QO-004", "severity": "P3", "category": "spec-drift", "title": "FR-070 to FR-076 ID collision between two plans"},
    {"id": "QO-005", "severity": "P3", "category": "untested", "title": "FR-TMP-008 has no // Verifies: traceability"},
    {"id": "QO-006", "severity": "P3", "category": "tooling", "title": "inspector.config.yml source.dirs omits portal/ and platform/"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "2x eslint-disable in production Source/Frontend"},
    {"id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "cycleService.ts (526L) and featureRequestService.ts (506L) exceed 500-line threshold"}
  ],
  "p1_count": 0,
  "p2_count": 3,
  "p3_count": 4,
  "p4_count": 1,
  "grading_basis": "B: max_p1=0 (met), max_p2=8 (met with 3)"
}
```

---

**Learnings saved** to `Teams/TheInspector/learnings/quality-oracle.md` for faster future audits.
