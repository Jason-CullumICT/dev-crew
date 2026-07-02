# Quality Oracle Findings — 2026-07-02

**Grade: C** | 1 P1 · 4 P2 · 3 P3

---

## Spec Coverage

| Scope | Requirements | Covered | % |
|-------|-------------|---------|---|
| Plans/self-judging-workflow (Source/) | FR-WF-001..013 (13) | 13 | **100%** |
| Plans/dependency-linking (Source/) | FR-dependency-* (16) | 16 (but 1 missing metric) | **94%** |
| Plans/dependency-linking (portal/) | FR-dependency-* (16) | 13 | **81%** |
| Specifications/tiered-merge-pipeline (platform/) | FR-TMP-001..010 (10) | 9 (FR-TMP-008 unverified) | **90%** |
| Enforcer default run (auto-selected plan) | FR-WF-001..013 | 13 | **100% PASS** |

> **Context**: Three parallel codebases exist — `Source/` (workflow-engine), `portal/` (dev-workflow-platform), and `platform/` (orchestrator). Each maps to different spec files. The traceability enforcer auto-selects only the most-recently-modified requirements.md; the other 7+ plans are not checked on default runs.

---

## QO-001: Missing `dependencyCheckDuration` Histogram in Source/ Metrics
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` requires four Prometheus metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` **histogram**, and `cycleDetectionEvents` counter. `Source/Backend/src/metrics.ts` implements only the three counters. The histogram (`dependencyCheckDuration`) is present in `portal/Backend/src/metrics.ts` but is **absent** from the `Source/` implementation. The architecture rule states "Prometheus metrics for domain-significant operations" — dependency BFS cycle-detection is exactly that.
- **Recommendation:** Add to `Source/Backend/src/metrics.ts`:
  ```typescript
  // Verifies: FR-dependency-metrics — dependency_check_duration_seconds
  export const dependencyCheckDuration = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness checks in seconds',
    labelNames: ['operation'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    registers: [registry],
  });
  ```
  Then import and use it in `Source/Backend/src/services/dependency.ts` around the BFS cycle-detection path.
- **Cross-ref:** TheFixer (backend metrics)

---

## QO-002: Traceability Enforcer Only Validates One Plan at a Time
- **Severity:** P2
- **Category:** architecture-violation / pattern-violation
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** Without `--plan` or `--file` arguments, the enforcer selects the **most-recently-modified** `requirements.md` under `Plans/` and silently ignores all others. Today it validates `Plans/self-judging-workflow/requirements.md` (13 FRs). The 7 other plans — including the open `Plans/dependency-linking/` requirements — receive no enforcement on default runs. Additionally, when the enforcer IS run against `Plans/dependency-linking/requirements.md`, the regex `FR-[A-Z0-9-]+` generates 7 false-positive failures by matching seed-data IDs (`FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`) and spec range references (`FR-070`, `FR-085`) from narrative prose — these are not real requirement IDs.
- **Recommendation:** Two changes: (1) Add a `--all` flag that iterates every `requirements.md` under `Plans/` and reports aggregate results. (2) Constrain the regex to match only table-row FR IDs: require the pattern to be preceded by `| ` (pipe) in the source file — e.g., `re.findall(r'\|\s*(FR-[A-Z0-9-]+)\s*\|', content)` instead of free-text scanning.
- **Cross-ref:** TheFixer (tools/traceability-enforcer.py)

---

## QO-003: Three Open Portal/ Requirements from dependency-linking Plan
- **Severity:** P2
- **Category:** spec-drift (portal/ implementation)
- **Detail:** `Plans/dependency-linking/requirements.md` records three confirmed open items in the `portal/` application (last updated in implementation delta table):

  | FR ID | Status | Missing |
  |-------|--------|---------|
  | `FR-dependency-api-types` | ❌ Open | `blocked_by?: string[]` absent from `portal/Shared/api.ts` `UpdateBugInput` and `UpdateFeatureRequestInput`. Frontend uses `as any` cast to work around missing type. |
  | `FR-dependency-seed` | ❌ Open | No `seed.ts` in `portal/Backend/src/database/`. BUG-0010, FR-0004, FR-0005, FR-0007 dependency seeds are never inserted. |
  | `FR-dependency-frontend-tests` | ❌ Open | `DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist in `portal/Frontend/tests/`. `DependencyPicker.test.tsx` exists but the other two components have no test coverage. |

- **File:** `portal/Shared/api.ts:32`, `portal/Shared/api.ts:59`, `portal/Backend/src/database/` (missing seed.ts), `portal/Frontend/tests/` (missing 2 test files)
- **Recommendation:** Route to TheFixer for portal/ backend: add `blocked_by?: string[]` to both input types; create `seed.ts` with idempotent seeding; create the two missing frontend test files.
- **Cross-ref:** TheFixer (portal/ implementation)

---

## QO-004: FR-TMP-008 Has No Verifies Comment
- **Severity:** P2
- **Category:** spec-drift (platform/ infrastructure)
- **File:** `platform/` (no Verifies: FR-TMP-008 anywhere)
- **Detail:** FR-TMP-008 ("Worker Container Prerequisites — gh CLI installed in Dockerfile.worker, Playwright installable, GITHUB_TOKEN passed") is the only FR-TMP requirement with no `// Verifies: FR-TMP-008` comment anywhere in `platform/`. `platform/Dockerfile.worker`, `container-manager.js`, and `workflow-engine.js` all exercise gh CLI and Playwright, but none carry the traceability comment. The other 9 FR-TMP requirements are traced.
- **Recommendation:** Add `// Verifies: FR-TMP-008` comment to `platform/Dockerfile.worker` near the gh CLI and Playwright install lines, and optionally to `platform/orchestrator/lib/container-manager.js` where the dockerfile path is referenced.
- **Cross-ref:** Solo-session only (platform/ is solo-session territory)

---

## QO-005: `workflow-engine.md` Spec Has No Numbered FR IDs
- **Severity:** P3
- **Category:** doc-stale / architecture-violation
- **File:** `Specifications/workflow-engine.md`
- **Detail:** This spec defines domain entities, routing rules, assessment pod roles, API endpoints, and NFRs — but contains **no `FR-XXX` numbered requirements**. The numbered FR-WF-001..013 identifiers used by the Source/ codebase exist only in `Plans/self-judging-workflow/requirements.md`, not in the canonical spec. This breaks the spec-first principle: the spec is the "source of truth" but cannot be cross-referenced directly from source code without going through the plan file. If the plan file is lost or out of date, traceability from code back to spec is severed.
- **Recommendation:** Add an `## Functional Requirements` table to `Specifications/workflow-engine.md` with the FR-WF-001..013 IDs (matching the plan file), or add a `Traces to: Plans/self-judging-workflow/requirements.md` reference link at the top of the spec — same pattern used by `tiered-merge-pipeline.md`.

---

## QO-006: FR-TMP-* Requirements Unreachable by Traceability Enforcer
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Plans/tiered-merge-pipeline/` (no requirements.md), `tools/traceability-enforcer.py:79`
- **Detail:** `Specifications/tiered-merge-pipeline.md` defines FR-TMP-001..010. The enforcer scans `Source/` and `E2E/`, but FR-TMP-* implementations live in `platform/orchestrator/lib/` — a directory intentionally excluded from agent access. There is also no `requirements.md` under `Plans/tiered-merge-pipeline/` for the enforcer to target. As a result, FR-TMP-* requirements can never be enforced by the traceability gate.
- **Recommendation:** Create `Plans/tiered-merge-pipeline/requirements.md` with the FR-TMP-001..010 table (copy from spec). Add `platform/` to the enforcer's scan directories so tests in `platform/orchestrator/lib/workflow-engine.test.js` are counted.

---

## QO-007: DebugPortalPage Uses Informal Verifies Comment
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file opens with `// Verifies: dev-crew debug portal — embedded container-test viewer` — an informal description rather than a canonical `FR-XXX` identifier. Every other Source/ file uses a proper `FR-WF-XXX` or `FR-dependency-*` ID. This component is legitimate functionality but has no spec requirement backing it.
- **Recommendation:** Either (a) add a formal FR to `Plans/self-judging-workflow/requirements.md` (e.g., FR-WF-014 for the debug portal iframe), or (b) note in the spec that the debug portal is out-of-scope infrastructure and mark the file accordingly.

---

## JSON Summary

```json
{
  "audit_date": "2026-07-02",
  "grade": "C",
  "spec_coverage": {
    "source_frwf": "100%",
    "source_dependency": "94%",
    "portal_dependency": "81%",
    "platform_frtmp": "90%"
  },
  "counts": {
    "p1": 1,
    "p2": 3,
    "p3": 3,
    "total": 7
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/architecture-violation", "title": "Missing dependencyCheckDuration histogram in Source/ metrics" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation/pattern-violation", "title": "Traceability enforcer only validates one plan at a time; false-positive regex" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "3 open portal/ requirements: FR-dependency-api-types, FR-dependency-seed, FR-dependency-frontend-tests" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-008 has no Verifies comment in platform/" },
    { "id": "QO-005", "severity": "P3", "category": "doc-stale/architecture-violation", "title": "workflow-engine.md has no numbered FR IDs" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "FR-TMP-* requirements unreachable by traceability enforcer" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "DebugPortalPage uses informal Verifies comment" }
  ],
  "positive_findings": [
    "Zero console.log in Source/ production code",
    "Zero empty catch blocks",
    "No hardcoded secrets",
    "All backend Source/ and portal/ files carry Verifies comments",
    "All list endpoints return {data: T[]} wrappers",
    "Logger abstraction used exclusively",
    "No direct DB calls from route handlers (service layer respected)"
  ]
}
```
