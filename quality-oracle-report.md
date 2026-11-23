---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec / Plan | FRs | Enforced | Coverage |
|-------------|-----|----------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001–013) | ✅ Yes | **100%** |
| `Specifications/dev-workflow-platform.md` | 69+ (FR-001–069, FR-dependency-*) | ❌ No (portal/ not scanned) | Unknown |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001–010) | ❌ No (platform/ not scanned) | ~90% (FR-TMP-007/008 confirmed) |
| `Plans/dependency-linking/requirements.md` | 7 (FR-dependency-*) | Partial | See QO-001–002 |

---

### QO-001: `GET /api/search` Not Implemented in Source/
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` requires a cross-entity search endpoint used by the DependencyPicker typeahead. The route is declared, test coverage exists, but the test file itself documents the gap: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No `search.ts` file exists in `Source/Backend/src/routes/`. The portal/ equivalent is fully implemented and registered. Source/ never received the implementation.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` mirroring the portal implementation (`portal/Backend/src/routes/search.ts`), then register it in `Source/Backend/src/app.ts` as `app.use('/api/search', searchRouter)`. Ensure the route includes a `// Verifies: FR-dependency-search` comment.
- **Cross-ref:** QO-002 (missing metric), `portal/Backend/src/routes/search.ts` (reference implementation)

---

### QO-002: `dependencyCheckDuration` Histogram Missing from Source/
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies four Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, and `dependencyCheckDuration` **histogram** ❌. The histogram is entirely absent from `Source/Backend/src/metrics.ts`. The portal implementation has `portal_dependency_check_duration_seconds` defined and used in `portal/Backend/src/services/dependencyService.ts` at lines 147 and 209. Source/'s dependency service (`Source/Backend/src/services/dependency.ts`) makes BFS traversals but never times them.
- **Recommendation:** Add a `Histogram` for `dependency_check_duration_seconds` to `Source/Backend/src/metrics.ts`, import it in `Source/Backend/src/services/dependency.ts`, and instrument the `hasUnresolvedBlockers` / `detectCycle` paths with `.startTimer()`. Add `// Verifies: FR-dependency-metrics` traceability comment.
- **Cross-ref:** QO-001, `portal/Backend/src/metrics.ts:23` (reference), `portal/Backend/src/services/dependencyService.ts:147`

---

### QO-003: `FR-dependency-seed` Requirement Has Zero Implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-dependency-seed section)
- **Detail:** The spec requires idempotent seed data: *"BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003; seeded after base items exist."* No seed script, seed function, or bootstrap call with these IDs exists anywhere in `portal/`, `Source/`, or `platform/`. The portal schema (`portal/Backend/src/database/schema.ts`) runs migrations only — no seed inserts. This requirement also has no `// Verifies: FR-dependency-seed` reference in any source file, making it invisible to the traceability enforcer.
- **Recommendation:** Add an idempotent seed function in `portal/Backend/src/database/schema.ts` or a separate `seed.ts` that inserts the dependency links after verifying the referenced bugs/FRs exist. Guard with `SELECT` before `INSERT`. Add `// Verifies: FR-dependency-seed` traceability comments.
- **Cross-ref:** `portal/Backend/src/services/dependencyService.ts:295` (INSERT pattern to follow)

---

### QO-004: Traceability Enforcer Blind to portal/ and platform/ Codebases
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:93`
- **Detail:** The enforcer hard-codes `source_dirs = ["Source", "E2E"]`. This project has three functional codebases: `Source/` (workflow engine), `portal/` (dev-workflow-platform), and `platform/` (orchestrator). The enforcer passes with 100% on 13 FR-WF-* requirements, creating false confidence — the 69+ FRs in `Specifications/dev-workflow-platform.md` and 10 FRs in `Specifications/tiered-merge-pipeline.md` are never verified against their respective directories. Spec drift in portal/ and platform/ is completely invisible. When run against `Specifications/dev-workflow-platform.md` manually, the enforcer reports 76 missing requirements (because it scans only Source/, not portal/).
- **Recommendation:** Add `portal` and `platform` to `source_dirs` in the enforcer, or extend the enforcer to map spec files to their implementation directories via config (e.g., in `inspector.config.yml`). Alternatively, add per-codebase enforcer invocations to the CI verification gates in CLAUDE.md.
- **Cross-ref:** `Teams/TheInspector/inspector.config.yml` — `specs.enforcer` only runs the default enforcer, `source.dirs` lists only `Source/`

---

### QO-005: `eslint-disable` in Production Frontend Code
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses a React exhaustive-deps warning. CLAUDE.md explicitly states *"No disabled linting rules (eslint-disable, nolint)"* as an architecture rule. The pattern is used to avoid a stale-closure re-render triggered by passing the full `filters` object; the author instead lists individual filter fields as dependencies. The intent is correct, but the suppression is not permitted by project standards.
- **Recommendation:** Refactor to remove the disable comment. Options: (a) wrap `filters` in `useMemo` to stabilize the reference, (b) accept the minor double-fetch risk and add each filter field as an explicit dep without the suppression comment, or (c) document an explicit project exception in CLAUDE.md if the pattern is intentional. The current approach is functional but violates stated rules.
- **Cross-ref:** CLAUDE.md Architecture Rules — "No disabled linting rules"

---

### QO-006: Silent JSON Parse Error Suppression in API Client
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` silently discards JSON parsing errors. While the outer `throw new Error(body.message ?? 'Request failed: ...')` still fires, any diagnostic information from a malformed JSON error body (e.g., a 500 with an HTML error page) is lost. CLAUDE.md states *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* No comment explains the suppression.
- **Recommendation:** Add a brief comment: `// Intentional: non-JSON error bodies (e.g., HTML 502) fall back to empty object; status code is preserved in the thrown Error message.` This documents the intentional degradation and satisfies the CLAUDE.md rule without changing behavior.
- **Cross-ref:** CLAUDE.md Architecture Rules — "Never swallow errors silently"

---

### QO-007: vite-env.d.ts Has No Verifies Comment (Recently Modified)
- **Severity:** P3  
- **Category:** untested
- **File:** `Source/Frontend/src/vite-env.d.ts`
- **Detail:** Modified within the last 14 days, contains no `// Verifies:` traceability comment. Per hygiene threshold, recently modified source files without traceability comments are P2–P3. However, this is a Vite-generated ambient type declaration with no business logic — it declares `interface ImportMeta` extensions. No functional requirement maps to it.
- **Recommendation:** No action required. The file is boilerplate; adding a spurious traceability comment would be noise. Consider adding it to an enforcer exclusion list to avoid future false positives.

---

```json
{
  "audit_date": "2026-11-23",
  "spec_coverage": {
    "self_judging_workflow_plan": "100% (13/13 FRs, enforcer passes)",
    "dev_workflow_platform_spec": "unknown (portal/ not scanned by enforcer)",
    "tiered_merge_pipeline_spec": "~90% (platform/ not scanned; FR-TMP-001–006, 009–010 confirmed in platform/)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "file": "Source/Backend/tests/routes/search.test.ts:1", "summary": "GET /api/search not implemented in Source/"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "file": "Source/Backend/src/metrics.ts", "summary": "dependencyCheckDuration histogram missing (FR-dependency-metrics)"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "file": "Specifications/dev-workflow-platform.md (FR-dependency-seed)", "summary": "Seed data requirement unimplemented in all codebases"},
    {"id": "QO-004", "severity": "P2", "category": "architecture-violation", "file": "tools/traceability-enforcer.py:93", "summary": "Enforcer blind to portal/ and platform/ — 79+ FRs unverified"},
    {"id": "QO-005", "severity": "P2", "category": "pattern-violation", "file": "Source/Frontend/src/hooks/useWorkItems.ts:63", "summary": "eslint-disable in production code violates CLAUDE.md rule"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "file": "Source/Frontend/src/api/client.ts:26", "summary": "Silent JSON parse error suppression with no explanatory comment"},
    {"id": "QO-007", "severity": "P3", "category": "untested", "file": "Source/Frontend/src/vite-env.d.ts", "summary": "No Verifies comment (boilerplate file — low impact)"}
  ],
  "grade": "C",
  "grade_rationale": "2 P1 findings disqualify A/B; portal/ and platform/ spec compliance is unverified by the enforcer, making true coverage unknown. No exploitable auth bypass or critical domain failure."
}
```

---

**Grade: C** — Two P1 spec-drift gaps (`GET /api/search` unimplemented, metrics histogram missing) prevent a higher grade. The systemic enforcer blind spot over `portal/` and `platform/` is the most consequential structural issue — it makes the green traceability gate misleading. The existing Source/ codebase is otherwise architecturally clean: no console.log in production, no hardcoded secrets, no DB calls from route handlers, no files over 500 lines, no skipped tests, and test traceability is thorough across all 14 backend test files.
