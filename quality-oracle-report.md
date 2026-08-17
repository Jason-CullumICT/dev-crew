Now let me produce the formal findings report:

---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec Family | Requirements | Implementation Location | Enforcer-Verified |
|-------------|-------------|------------------------|-------------------|
| `dev-workflow-platform.md` | 85 (FR-001..069 + FR-dependency-*) | `portal/` (FR-001..095 traced) | ❌ No |
| `tiered-merge-pipeline.md` | 10 (FR-TMP-001..010) | `platform/orchestrator/` | ❌ No |
| `Plans/self-judging-workflow` | 13 (FR-WF-001..013) | `Source/` | ✅ Yes (100%) |
| **Total** | **108** | | **12% enforcer-visible** |

**Real coverage: ~107/108 = 99%** (one genuine gap: FR-dependency-search backend route)
**Enforcer-reported: 100%** (of 13 requirements — 12% of total)

---

### QO-001: GET /api/search endpoint not wired — DependencyPicker typeahead broken
- **Severity:** P1
- **Category:** spec-drift / correctness
- **File:** `Source/Backend/src/app.ts` (route absent), `Source/Backend/tests/routes/search.test.ts:3`
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` endpoint for cross-entity typeahead. The test file explicitly documents: *"the GET /api/search endpoint is NOT wired into app.ts — these tests will FAIL until implemented."* The frontend `DependencyPicker.tsx:54` calls `workItemsApi.searchItems()` which resolves to `GET /search` — this request will 404 in any live environment, making dependency search completely non-functional. The route handler logic doesn't exist anywhere in `Source/Backend/src/`.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` with a handler that filters the in-memory store by title/description across all non-deleted items, register it in `app.ts` as `app.use('/api', searchRouter)`, and add `// Verifies: FR-dependency-search`.
- **Cross-ref:** TheFixer (bug fix), TheGuardians (search input not sanitised yet)

---

### QO-002: Traceability enforcer scans only 12% of total requirements
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:70`
- **Detail:** The enforcer hard-codes `source_dirs = ["Source", "E2E"]` and auto-targets the most-recently-modified `requirements.md` under `Plans/`. This means it verifies only 13 of 108 total requirements. The other 95 (FR-001..069 in `portal/`, FR-TMP-001..010 in `platform/`) are excluded from scanning. The pipeline gate `python3 tools/traceability-enforcer.py` reports "TRACEABILITY PASSED" every run regardless of what's missing in portal or platform. The `spec-drift-report.json` compounds this — it shows FR-TMP-* at 0% coverage and FR-WF-* as "unresolved legacy IDs," but both are fully implemented — just in directories the report script can't see.
- **Recommendation:** Extend `source_dirs` to `["Source", "E2E", "portal", "platform"]` and add a second path-arg variant targeting `Specifications/` requirement IDs. At minimum, add a comment in `spec-drift-report.json` noting the scan is Source/-only.
- **Cross-ref:** team-leader (tooling change), TheFixer

---

### QO-003: Three silent catch blocks swallow errors (architecture rule violation)
- **Severity:** P2
- **Category:** architecture-violation / pattern-violation
- **File:** `portal/Frontend/src/components/common/RepoSelector.tsx:20`, `portal/Frontend/src/components/bugs/BugDetail.tsx:82`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`
- **Detail:** All three call `repos.list().then(...).catch(() => {})` with a completely empty catch body — no log, no re-throw, no inline comment explaining why suppression is intentional. CLAUDE.md states: *"every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* If `repos.list()` fails (network issue, backend restart), the failure is invisible to the user and to observability. Note: `TeamsPage.tsx` does this correctly — it has explicit comments ("history is non-critical — fail silently", "recording is best-effort") which satisfy the documentation requirement.
- **Recommendation:** Add `// repo list is non-critical UI enhancement — fail silently` comment on each `.catch(() => {})` block, or preferably log the error: `.catch((err) => logger.warn('repo list failed', { err }))`.
- **Cross-ref:** TheFixer

---

### QO-004: Three recently-modified portal files have no `// Verifies:` traceability
- **Severity:** P2
- **Category:** untested / spec-drift
- **Files:**
  - `portal/Backend/src/routes/teamDispatches.ts` (modified ≤14 days, 86 lines)
  - `portal/Frontend/src/pages/TeamsPage.tsx` (modified ≤14 days, 407 lines)
  - `portal/Frontend/src/components/common/RepoSelector.tsx` (modified ≤14 days)
- **Detail:** All three were modified within the last 14 days (git log confirms). None carry a single `// Verifies:` comment and none map to any FR in `Specifications/dev-workflow-platform.md` or any Plans file. This is either undocumented scope creep or features added outside the spec-first workflow required by CLAUDE.md. The team dispatch feature (recording and displaying which teams have been dispatched) is a legitimate product feature but has no spec FR.
- **Recommendation:** Either add corresponding FRs to `Specifications/dev-workflow-platform.md` (e.g., FR-096: Team Dispatch History tracking) and backfill `// Verifies:` tags, or document explicitly why these are infrastructure/operational code exempt from traceability.
- **Cross-ref:** requirements-reviewer

---

### QO-005: FR-TMP-001 (Risk Classification) missing source-level traceability tag
- **Severity:** P2
- **Category:** spec-drift
- **File:** `platform/orchestrator/lib/workflow-engine.js` (lines ~966-1097)
- **Detail:** `FR-TMP-001` (Risk Classification) is referenced in tests (`workflow-engine.test.js:63`) but has no `// Verifies: FR-TMP-001` comment in the implementation. The risk classification logic at lines 966 and 1097 (parsing `RISK_LEVEL:` from leader output, defaulting to `config.defaultRiskLevel`) implements the spec but is untagged. `FR-TMP-008` (Worker Prerequisites) in `Dockerfile.worker` carries the wrong tag: `// Verifies: dev-crew unified repo — Task 3 Step 2` instead of `// Verifies: FR-TMP-008`.
- **Recommendation:** Add `// Verifies: FR-TMP-001 — extract riskLevel from leader output` at line ~1096 in `workflow-engine.js`. Update `Dockerfile.worker:3` to `// Verifies: FR-TMP-008 — gh CLI and Playwright installed`.
- **Cross-ref:** TheFixer (minor tag correction)

---

### QO-006: 113 `console.log` calls in platform orchestrator (production code)
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `platform/orchestrator/lib/workflow-engine.js`
- **Detail:** CLAUDE.md mandates structured logging; `console.log` is prohibited in production. `workflow-engine.js` contains 113 raw `console.log` calls used for progress tracing, which bypass OTel trace correlation and Prometheus metrics. While platform/ has a logger abstraction (`platform/orchestrator/lib/logger.ts` based on context), the orchestrator's main engine doesn't use it.
- **Recommendation:** Replace `console.log` calls with the project logger (`logger.info`, `logger.debug`, etc.) to ensure trace IDs propagate and log output is structured JSON in production.
- **Cross-ref:** TheFixer (refactor, low urgency)

---

### QO-007: `eslint-disable-next-line` suppressing hook dependency warnings
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. These are CLAUDE.md's "disabled linting rules" pattern. While not always wrong, suppressing exhaustive-deps can hide stale closure bugs that are hard to reproduce. No comment explains why the dependency is intentionally omitted.
- **Recommendation:** Add inline comment explaining why the dependency is excluded (e.g., `// intentionally omit X — would cause infinite loop`), or restructure the effect to avoid suppression.

---

### QO-008: Hardcoded `http://localhost:${port}` URL in portal component
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `portal/Frontend/src/components/orchestrator/CycleCard.tsx:112`
- **Detail:** `href={`http://localhost:${port}`}` hardcodes the scheme and host. CLAUDE.md mandates no hardcoded URLs. In any non-localhost deployment (staging, CI preview, Docker network), this link will be wrong.
- **Recommendation:** Derive the URL from a shared config/env var (e.g., `VITE_APP_BASE_URL` or a `getAppUrl(port)` helper).

---

### JSON Summary

```json
{
  "audit_date": "2026-08-17",
  "grade": "C",
  "spec_coverage": {
    "enforcer_visible_pct": 12,
    "real_pct": 99,
    "total_requirements": 108,
    "enforcer_checks": 13,
    "unimplemented": ["FR-dependency-search (backend route)"],
    "tagging_gaps": ["FR-TMP-001 (no source tag)", "FR-TMP-008 (wrong tag)"]
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "GET /api/search not wired — DependencyPicker broken" },
    { "id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer scans only 12% of requirements" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "3 silent catch blocks in portal — CLAUDE.md violation" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "3 recently-modified portal files with no FR traceability" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001/008 missing or wrong Verifies tags in platform" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "113 console.log in platform orchestrator" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressing hook dependency warnings" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Hardcoded localhost URL in CycleCard" }
  ],
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 0,
  "routing": {
    "TheFixer": ["QO-001", "QO-003", "QO-005", "QO-006", "QO-007", "QO-008"],
    "requirements-reviewer": ["QO-004"],
    "team-leader": ["QO-002"]
  }
}
```

---

**Grade: C** — 2 P1 findings (broken feature + misleading compliance gate) and 3 P2s. The real implementation coverage is excellent (~99%), but the enforcement infrastructure gives false confidence, and one spec-required feature (dependency search) is non-functional in production. Once QO-001 and QO-002 are resolved the project is on track for a solid B/A.
