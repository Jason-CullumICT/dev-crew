Now let me produce the full audit report:

---

## Quality Oracle Findings — 2026-10-17

---

### Spec Coverage: ~12% (enforcer scope only)

| Spec | Requirements | Enforcer Coverage |
|------|-------------|------------------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-\*) | 13 | ✅ 13/13 (PASSED) |
| `Specifications/dev-workflow-platform.md` (FR-001–069, FR-dependency-\*) | ~86 | ❌ 0/86 — not scanned |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | ❌ 0/10 — not scanned |
| `Specifications/workflow-engine.md` | narrative (no FR-IDs) | N/A |

**Total spec surface: ~109 requirements. Enforcer covers 13 (12%). The enforcer reports PASSED while 87% of requirements go unverified.**

---

### QO-001: Traceability Enforcer Blind to 87% of Spec Requirements
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most-recently-modified `Plans/*/requirements.md`. With no `--plan` flag it currently targets `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* requirements for the Source/ app). It does not scan:
  - `Specifications/dev-workflow-platform.md` — 69 FRs (FR-001–069) for the **portal/** app, plus 17 FR-dependency-* requirements
  - `Specifications/tiered-merge-pipeline.md` — 10 FR-TMP-* requirements for the **platform/** orchestrator
  
  The enforcer exits `TRACEABILITY PASSED` today but 96 spec requirements receive zero automated coverage verification. Any CI gate running this tool gives a false green.
- **Recommendation:** Either (a) add a dedicated `requirements.md` under each plan folder that mirrors the canonical Specification FRs so the enforcer can target them, or (b) extend the enforcer to accept `--spec Specifications/dev-workflow-platform.md` and scan portal/ and platform/ code trees. Add all three enforcer invocations to the verification gate in CLAUDE.md.
- **Cross-ref:** QO-004 (ID mismatch means even a scan would find many gaps)

---

### QO-002: Direct DB Calls in Portal Route Handlers (Architecture Rule Violation)
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37`, `portal/Backend/src/routes/featureRequests.ts:39`, `portal/Backend/src/routes/bugs.ts:38`, `portal/Backend/src/routes/cycles.ts:30` (and 6 more route files)
- **Detail:** The architecture rule states "No direct DB calls from route handlers — use the service layer." Two violations of increasing severity:
  1. **Inline SQL in routes (worst):** `teamDispatches.ts` lines 37–44 and 72–75 execute `db.prepare(…).all(…)` and `db.prepare(…).run(…)` directly — there is no service layer for team dispatches at all. Business logic and query construction live entirely in the route handler.
  2. **DB handle injection via routes (partial):** 8 other route files (`featureRequests.ts`, `bugs.ts`, `cycles.ts`, `search.ts`, `dashboard.ts`, `features.ts`, `learnings.ts`, `pipelines.ts`) call `getDb()` inside the route handler and pass the connection to service functions. Service functions are used, but the route handler owns the db connection lifecycle, coupling it to the HTTP layer.
- **Failure scenario:** A change to `getDb()` initialization timing or transaction management requires modifying route handlers, not just the service layer. The `teamDispatches` route cannot be unit-tested without a real DB.
- **Recommendation:** Create a `teamDispatchService.ts` with `listDispatches(db, opts)` and `createDispatch(db, data)`. Move `db.prepare(…)` calls there. For other routes, consider having services own their own `getDb()` calls rather than receiving it as a parameter.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: 174 `console.*` Calls in Platform Orchestrator (No Logger Abstraction)
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `platform/orchestrator/lib/workflow-engine.js` (174 instances), `platform/orchestrator/lib/dispatch.js`
- **Detail:** Architecture rule: "Use the project's logger abstraction, never `console.log` or `log.Printf`." The orchestrator is production infrastructure (not a script or test helper). All 174 `console.log`, `console.warn` calls produce unstructured plain-text output. Log entries cannot be parsed by JSON-aware log aggregation, cannot be correlated by trace/span ID, and bypass `LOG_LEVEL` control. Example at `workflow-engine.js:804`: `console.log(\`[${run.id}] PR #${run.pr.number} status: ${run.pr.status}…\`)` — this is domain-significant (PR merge decision) and should carry structured fields.
- **Failure scenario:** In production, the only record of a merge failure or E2E skip may be an unstructured console line that gets truncated or lost in log aggregation. Post-incident forensics become unreliable.
- **Recommendation:** The platform orchestrator is solo-session territory (CLAUDE.md: "platform/ — solo-session only"). A solo session should introduce a logger module in `platform/orchestrator/lib/logger.js` and replace console.* calls with structured `logger.info(msg, {fields})` calls.

---

### QO-004: FR-dependency-\* Traceability IDs Mismatch Between Spec and Code
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/services/dependencyService.ts`, `portal/Frontend/src/components/shared/DependencySection.tsx`
- **Detail:** `Specifications/dev-workflow-platform.md` defines 16 dependency requirements with canonical IDs: `FR-dependency-types`, `FR-dependency-api-types`, `FR-dependency-schema`, `FR-dependency-service`, `FR-dependency-dispatch-gating`, `FR-dependency-endpoints`, `FR-dependency-search`, `FR-dependency-metrics`, `FR-dependency-seed`, `FR-dependency-backend-tests`, `FR-dependency-api-client`, `FR-dependency-blocked-badge`, `FR-dependency-section`, `FR-dependency-picker`, `FR-dependency-integration`, `FR-dependency-frontend-tests`.
  
  Portal code uses entirely different IDs: `FR-dependency-cycle`, `FR-dependency-dispatch`, `FR-dependency-linking`, `FR-dependency-ready`. None of these appear in the specification. The following spec IDs have **zero** coverage in code: `FR-dependency-schema`, `FR-dependency-metrics`, `FR-dependency-seed`, `FR-dependency-backend-tests`, `FR-dependency-api-client`, `FR-dependency-frontend-tests`.
- **Failure scenario:** Running any future traceability scan against the spec IDs would show ~100% of dependency requirements unimplemented — masking what is actually substantial implementation.
- **Recommendation:** Align `// Verifies:` comments in portal/ code to the canonical spec IDs. If the portal implementation used different IDs during development, update the Verifies comments to match the official spec (or formally amend the spec to use the in-code IDs, then ratify).

---

### QO-005: FR-073–FR-079 and FR-DUP-\* Implemented but Absent from Specifications/
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/routes/featureRequests.ts`, `portal/Backend/src/middleware/upload.ts`, `portal/Backend/src/services/imageService.ts`
- **Detail:** Portal code and plan integration-review reports reference FR-073 (Multer config), FR-074 (Image Service), FR-075–077 (Image Routes), FR-078 (Orchestrator Proxy multipart), FR-079 (Observability), plus FR-DUP-01 through FR-DUP-13. None of these IDs appear in `Specifications/dev-workflow-platform.md`. These FRs were born during pipeline runs and ratified only in `Plans/dev-workflow-platform/integration-review-report-image-upload.md` — a plan artifact, not a canonical specification.
- **Failure scenario:** The specification is the source of truth (CLAUDE.md: "Specs are source of truth"). Features implemented against plan-only FRs are unverifiable against the canonical spec, and any new agent working from the spec will not know these features exist or have requirements.
- **Recommendation:** Add FR-073–FR-079 and FR-DUP-* formally to `Specifications/dev-workflow-platform.md`. This is a requirements-reviewer / solo-session task.

---

### QO-006: Empty Catch Blocks Silently Swallow Errors in Portal Frontend
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `portal/Frontend/src/components/bugs/BugDetail.tsx:82`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`, `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- **Detail:** Architecture rule: "Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed." All three sites use `.catch(() => {})`, a silent swallow with no logging, no user feedback, and no documentation of intent. In `BugDetail.tsx` and `FeatureRequestDetail.tsx` these guard dependency-fetch calls — a failure here leaves stale data silently displayed without any signal to the user or developer.
- **Failure scenario:** Dependency fetch fails (network error, 404) → user sees empty dependency section with no error indication → assumes item has no dependencies → makes incorrect triage decisions.
- **Recommendation:** Replace with `.catch((err) => logger.warn('dependency fetch failed', { err }))` or show an inline error state. If the error is genuinely safe to ignore, add a comment explaining why.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-007: Two Portal Service Files Exceed 500-Line Threshold
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `portal/Backend/src/services/cycleService.ts` (526 lines), `portal/Backend/src/services/featureRequestService.ts` (506 lines)
- **Detail:** Both files exceed the 500-line threshold for splitting. `cycleService.ts` handles cycle creation, phase advancement, pipeline linking, ticket management, and cycle completion — at least 3 cohesive sub-services. `featureRequestService.ts` handles CRUD, duplicate detection, voting, approval, and FR-writer enrichment — again, multiple distinct concerns.
- **Recommendation:** Extract `pipelineService.ts` (already exists separately — check for duplication with cycleService pipeline logic), `ticketService.ts`, and `votingService.ts` as separate modules. Reduces cognitive load and enables more targeted testing.

---

### QO-008: FR-TMP-008 Has No `Verifies:` Comment in Dockerfile.worker
- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:32-40`
- **Detail:** FR-TMP-008 requires `gh` CLI and Playwright to be installed in the worker container. Both are present (`apt-get install -y gh` at line 32, `playwright install chromium` at line 38–40), but the file has no `# Verifies: FR-TMP-008` comment. Unlike all other FR-TMP-* requirements, this one has no trace anchor.
- **Recommendation:** Add `# Verifies: FR-TMP-008 — Worker container prerequisites (gh CLI + Playwright)` comment above the relevant RUN block.

---

### QO-009: `eslint-disable` Comments in Source Frontend Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` warnings with `// eslint-disable-next-line`. These rules exist to prevent stale closure bugs. Suppressing them rather than fixing the dependency arrays risks subtle race conditions or stale data renders. Architecture rule: "Disabled linting rules" are flagged.
- **Recommendation:** Fix the dependency arrays in the hooks/callbacks so the exhaustive-deps rule passes naturally. If a dependency is intentionally excluded (e.g., a ref), use `useRef` or restructure the hook rather than silencing the linter.

---

### JSON Summary

```json
{
  "audit_date": "2026-10-17",
  "grade": "C",
  "spec_coverage_enforcer": "12% (13/109 requirements scanned)",
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer blind to 87% of spec requirements"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Direct DB calls in portal route handlers"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "174 console.* calls in platform orchestrator"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency traceability IDs mismatch spec vs code"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-073–079 and FR-DUP-* implemented but absent from Specifications/"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Empty catch blocks silently swallow errors in portal Frontend"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Two portal service files exceed 500-line threshold"},
    {"id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 missing Verifies comment in Dockerfile.worker"},
    {"id": "QO-009", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable in Source Frontend production code"}
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 4,
  "grade_rationale": "1 P1 disqualifies B; 4 P2 + spec coverage ~12% puts this in C range per grading config (max_p2: 15, min_spec_coverage: 40 — enforcer coverage is technically 100% of what it scans, but actual coverage is 12% which fails the 40% threshold)"
}
```

---

### Routing

| Finding | Route |
|---------|-------|
| QO-001 | Requirements Reviewer (expand enforcer scope) + solo session |
| QO-002, QO-006 | [ESCALATE → TheFixer] |
| QO-003 | Solo session (platform/ is solo-session only) |
| QO-004, QO-005 | Requirements Reviewer (spec amendment) |
| QO-007, QO-008, QO-009 | [ESCALATE → TheFixer] |
