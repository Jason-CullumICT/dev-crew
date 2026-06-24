Now the full findings report:

---

## Quality Oracle Findings

### Spec Coverage Summary

| Specification | Total FRs | Traced in Code | Coverage | Enforcer Result |
|---|---|---|---|---|
| `workflow-engine.md` (Source/) | 13 (FR-WF-001–013) | 13 | **100%** | ✅ PASS |
| `dev-workflow-platform.md` (portal/) | 85 (FR-001–069 + FR-dependency-*) | ~73 | **~86%** | ❌ FALSE FAIL (enforcer blind to portal/) |
| `tiered-merge-pipeline.md` (platform/) | 10 (FR-TMP-001–010) | 9† | **90%** | ❌ FALSE FAIL (enforcer blind to platform/) |

†FR-TMP-008 is infrastructure-only (Dockerfile), acknowledged as N/A in prior QA report.

---

### QO-001: Traceability Enforcer Is Blind to Two of Three Codebases

- **Severity:** P1
- **Category:** spec-drift / tool-failure
- **File:** `tools/traceability-enforcer.py:72–83`
- **Detail:** The enforcer hardcodes scan paths `["Source", "E2E"]`. This repo contains THREE source trees: `Source/` (workflow engine), `portal/` (dev-workflow-platform), and `platform/orchestrator/` (tiered-merge-pipeline). Running the enforcer against `Specifications/dev-workflow-platform.md` produces **76 false failures**; against `Specifications/tiered-merge-pipeline.md` produces **13 false failures** — even though implementations exist and are well-traced. The verification gate is unreliable: it would cause agents to believe every portal/ and platform/ requirement is unimplemented.
- **Recommendation:** Extend the `source_dirs` list in `check_traceability()` to also scan `portal/` and `platform/`. Expose it as config in `inspector.config.yml`'s `specs.patterns.enforcer` section. Alternatively, adopt the `source.dirs` config from `inspector.config.yml` to avoid future hardcoding.
- **Cross-ref:** TheFixer (code fix to enforcer)

---

### QO-002: Direct SQL Queries in Portal Route Handler (Architecture Violation)

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37–43, 72–75`
- **Detail:** `teamDispatches.ts` executes `db.prepare(...).all()` and `db.prepare(...).run()` directly inside GET and POST route handlers. There is no service function in `portal/Backend/src/services/` for team dispatch data. CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* Three query calls violate this directly.
- **Recommendation:** Extract a `teamDispatchService.ts` with `listTeamDispatches(db, opts)` and `createTeamDispatch(db, data)` functions. Route handler should call service functions. Also move the `interface TeamDispatch` to `portal/Shared/types/`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: Specifications Directory Missing Coverage for FR-070–095 and FR-DUP-*

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical spec ends at FR-069. However, portal/ source code traces **FR-070 to FR-095** (image upload, Plans/image-upload/) and **FR-DUP-01 to FR-DUP-13** (Plans/duplicate-deprecated-status/). These are implemented and tested in portal/ but their specs live only in Plans/ documents, not in `Specifications/`. CLAUDE.md mandates: *"Specs are source of truth — implementation traces to specs, never the other way around."* 26 requirement IDs have no canonical spec entry.
- **Recommendation:** Extend `Specifications/dev-workflow-platform.md` with sections for Image Attachments (FR-070–095) and Duplicate/Deprecated Status (FR-DUP-01–13), incorporating the acceptance criteria from the Plans/ documents into the authoritative spec.
- **Cross-ref:** requirements-reviewer

---

### QO-004: portal/ FR-dependency-* Coverage at Only 25% (4 of 16 IDs Traced)

- **Severity:** P2
- **Category:** spec-drift / traceability
- **File:** `portal/Backend/src/services/dependencyService.ts`, `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/routes/featureRequests.ts`
- **Detail:** The `Plans/dependency-linking/requirements.md` plan specifies 16 FR-dependency-* requirements for `portal/` implementation. Portal code only carries traceability comments for 4: `FR-dependency-linking`, `FR-dependency-cycle-detection`, `FR-dependency-dispatch-gating`, `FR-dependency-ready-check`. The following 12 IDs are **untraced in portal/**: FR-dependency-types, FR-dependency-api-types, FR-dependency-schema, FR-dependency-service, FR-dependency-endpoints, FR-dependency-search, FR-dependency-metrics, FR-dependency-seed, FR-dependency-backend-tests, FR-dependency-api-client, FR-dependency-blocked-badge, FR-dependency-section, FR-dependency-picker, FR-dependency-integration, FR-dependency-frontend-tests. Note: `Source/` traces all 15 of these for its own parallel dependency feature (a different codebase).
- **Recommendation:** Add `// Verifies: FR-dependency-{id}` comments to the corresponding portal/ service/route/component files where those behaviours are implemented.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005: eslint-disable Suppressing Hook Dependency Warnings Without Justification

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Two production files suppress `react-hooks/exhaustive-deps` with `eslint-disable-next-line`. CLAUDE.md architecture rule requires using the project's patterns; disabling lint rules without an inline explanation of why it's safe creates stale effects or missed dependency bugs.
- **Recommendation:** For each suppression, either (a) restructure the effect to correctly declare dependencies, or (b) add a comment explaining the intentional omission (e.g., `// eslint-disable-next-line react-hooks/exhaustive-deps — intentionally omit 'X' to avoid infinite loop because ...`).

---

### QO-006: portal/ Route Handlers Acquire DB Connection Directly

- **Severity:** P3
- **Category:** architecture-violation (gray area)
- **File:** All `portal/Backend/src/routes/*.ts` files (8 files, 60+ `getDb()` calls)
- **Detail:** Every portal route handler calls `const db = getDb()` and passes the connection to service functions. While the actual SQL runs in services, the routes still import from `../database/connection`. A stricter reading of "No direct DB calls from route handlers" means routes should not touch the DB layer at all — not even to acquire a connection. The `Source/` codebase avoids this pattern entirely (routes call store/service functions with no db reference).
- **Recommendation:** Move `getDb()` calls into service functions themselves (pattern used by Source/). Route handlers call `serviceFunction(params)` only, never `serviceFunction(db, params)`. This eliminates the `getDb` import from routes.
- **Cross-ref:** [ESCALATE → TheFixer (medium-effort refactor)]

---

### QO-007: Large Source Files Exceeding 500-Line Threshold

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — 550 lines
  - `portal/Frontend/src/components/bugs/BugDetail.tsx` — 546 lines
  - `portal/Frontend/src/api/client.ts` — 525 lines
- **Detail:** Files over 500 lines are harder to review and tend to accumulate responsibility. All five are in the portal/ application.
- **Recommendation:** Consider splitting `cycleService.ts` into lifecycle and feedback concerns; `FeatureRequestDetail.tsx` and `BugDetail.tsx` may benefit from extracting the DependencySection and feedback panels into sub-components; `client.ts` could group endpoints into domain modules.

---

### QO-008: FR-TMP-008 Has No In-Code Traceability Annotation

- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:39–40`
- **Detail:** FR-TMP-008 (Worker Container Prerequisites — gh CLI + Playwright) is implemented purely in Dockerfile infrastructure and cannot carry `// Verifies:` inline comments. The prior QA report acknowledges "FR-TMP-008 N/A (infrastructure)." However there is no compensating mechanism (e.g. a comment in config.js or a README note) to document the linkage.
- **Recommendation:** Add a comment block in `platform/orchestrator/lib/config.js` or a `platform/README.md` section: `// Verifies: FR-TMP-008 — gh CLI and Playwright are installed in Dockerfile.worker:26-40`. This makes the linkage machine-discoverable without requiring change to Dockerfile syntax.

---

### QO-009: Inline Type Definition in Portal Route Handler

- **Severity:** P4
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:14–22`
- **Detail:** `interface TeamDispatch` is defined inline in the route file. CLAUDE.md: *"Shared types are single source of truth — no inline type re-definitions across layers."* Even if `TeamDispatch` is currently used only here, defining it in the route makes future sharing impossible.
- **Recommendation:** Move `TeamDispatch` to `portal/Shared/types/` and import it.

---

### QO-010: Traceability Enforcer Matches Placeholder IDs (FR-XXX, FR-XXXX)

- **Severity:** P4
- **Category:** tool-failure
- **File:** `tools/traceability-enforcer.py:64`
- **Detail:** The enforcer's regex `FR-[A-Z0-9-]+` matches `FR-XXX` and `FR-XXXX` — the placeholder IDs used in spec example tables. When run against `dev-workflow-platform.md`, it reports them as unimplemented requirements. These are documentation artefacts, not real requirement IDs.
- **Recommendation:** Tighten the regex to require at least one digit: `FR-[A-Z]*\d+[A-Z0-9-]*` or exclude pure-letter suffixes. Or add a post-filter to discard `FR-XXX` and `FR-XXXX`.

---

### Summary JSON

```json
{
  "audit_date": "2026-06-24",
  "grade": "C",
  "grading_rationale": "0 P1-exploitable issues, but P1 tool failure makes the verification gate unreliable; 3 P2 findings (tool blind spot treated as P1 functionally, architecture violations, spec drift); config threshold C = max_p1:2, max_p2:15, min_spec_coverage:40",
  "spec_coverage": {
    "workflow_engine": { "total": 13, "covered": 13, "pct": 100 },
    "dev_workflow_platform": { "total": 85, "covered": 73, "pct": 86 },
    "tiered_merge_pipeline": { "total": 10, "covered": 9, "pct": 90 },
    "enforcer_reported": { "total": 13, "covered": 13, "pct": 100, "note": "enforcer only evaluates Source/ requirements" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "tool-failure", "title": "Traceability enforcer blind to portal/ and platform/", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Direct SQL in portal route handler (teamDispatches.ts)", "file": "portal/Backend/src/routes/teamDispatches.ts" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-070–095 and FR-DUP-* not in Specifications/", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-004", "severity": "P2", "category": "traceability", "title": "portal/ FR-dependency-* coverage 25% (4/16)", "file": "portal/Backend/src/services/dependencyService.ts" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without justification in Source/Frontend", "file": "Source/Frontend/src/components/DependencyPicker.tsx" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "portal/ routes acquire DB connection directly", "file": "portal/Backend/src/routes/*.ts" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "5 portal/ files exceed 500-line threshold", "file": "portal/Backend/src/services/cycleService.ts" },
    { "id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 no in-code traceability anchor", "file": "platform/Dockerfile.worker" },
    { "id": "QO-009", "severity": "P4", "category": "architecture-violation", "title": "Inline TeamDispatch type in route handler", "file": "portal/Backend/src/routes/teamDispatches.ts" },
    { "id": "QO-010", "severity": "P4", "category": "tool-failure", "title": "Enforcer regex matches FR-XXX placeholder IDs", "file": "tools/traceability-enforcer.py" }
  ],
  "escalations": [
    { "finding": "QO-002", "team": "TheFixer", "reason": "Architecture fix: extract service layer for teamDispatches" },
    { "finding": "QO-003", "team": "requirements-reviewer", "reason": "Spec update needed to cover FR-070–095 and FR-DUP-*" },
    { "finding": "QO-004", "team": "TheFixer", "reason": "Traceability comment additions to portal/ dependency code" }
  ]
}
```

---

**Grade rationale:** The `Source/` codebase (self-judging workflow engine) is clean — 100% spec coverage, no architecture violations, full traceability. The `portal/` codebase has gaps: spec doesn't cover 26 implemented requirements, dependency traceability is sparse, and one route bypasses the service layer. The critical tool failure (QO-001) means the enforcer verification gate is silently broken for two of three codebases. Grade: **C** (borderline B — would be B if the enforcer were fixed and FR-070–095 added to Specifications/).
