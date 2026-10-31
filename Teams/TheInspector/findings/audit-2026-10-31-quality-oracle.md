# Quality Oracle Audit — 2026-10-31

**Config:** `Teams/TheInspector/inspector.config.yml`  
**Mode:** Full static audit (no live services)  
**Grade:** C (1 P1 config mismatch, 3 P2s, 2 P3s, 2 P4s)

---

## Spec Coverage Summary

| Spec File | FR Count | Covered | Coverage |
|-----------|----------|---------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 16 | 15 | **94%** |
| `Specifications/dev-workflow-platform.md` (FR-001 – FR-069) | 69 | 0 in Source/ | **0%*** |

> \* FR-001–FR-069 describe the `portal/` application. `Source/` implements the workflow engine. These are **separate systems** — the 0% is not a regression, it is a systemic configuration mismatch (see QO-001).

**Traceability tool result:**  
`python3 tools/traceability-enforcer.py` → **PASSED** (auto-targets self-judging-workflow, 13/13 covered)  
`python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` → **FAILED** (7 false-positive misses due to cross-doc FR-ID references; 1 real miss: `FR-dependency-seed`)

---

## QO-001: Inspector config `specs.dir` maps to wrong application layer
- **Severity:** P1
- **Category:** architecture-violation / config-mismatch
- **File:** `Teams/TheInspector/inspector.config.yml:33`
- **Detail:** `specs.dir: "Specifications/"` points to `dev-workflow-platform.md` which describes the **portal/** app (FR-001–FR-069 — FeatureRequests, BugReports, DevelopmentCycles). `source.dirs: ["Source/"]` is the **workflow engine** (FR-WF-* series). These two systems are unrelated. Any cross-reference analysis between `Specifications/` and `Source/` will produce meaningless results. Additionally, `specs.patterns.traceability: "FR-\\d+"` won't match the `FR-WF-\d+` or `FR-dependency-*` naming schemes actually used in `Source/`.
- **Recommendation:** Update `inspector.config.yml` — either (a) point `specs.dir` to `Plans/` and `specs.implementation_dir` to `Plans/self-judging-workflow/` and `Plans/dependency-linking/`, or (b) add a second specs block for the portal/ system with its own source dir mapping. Fix the traceability pattern to `"FR-[A-Z][A-Z0-9-]+"` to capture both naming schemes.
- **Cross-ref:** May affect all other TheInspector specialists that consume `specs.dir`.

---

## QO-002: Route handlers bypass service layer — direct store imports
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/workflow.ts:15` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/intake.ts:4` — `import * as store from '../store/workItemStore'`
- **Detail:** CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import and call `store.*` methods directly from the request handler body, bypassing any service layer. While the backing store is in-memory rather than a SQL DB, the rule targets layering — not persistence technology. Route handlers should only call service functions; the store should only be accessed from services.
- **Failure scenario:** A second caller path (e.g., a future event listener) that replicates route-level store calls will silently skip change-history tracking or metrics that were only added in the route — because the logic wasn't centralized in the service.
- **Recommendation:** Extract store calls in routes into service functions (e.g., `workItemService.create`, `workItemService.update`). Routes should orchestrate: validate input → call service → return response.
- **Cross-ref:** TheFixer for refactor; does not block current tests.

---

## QO-003: FR-dependency-seed not implemented — no traceability, no code
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/` (missing: `store/seed.ts` or similar)
- **Detail:** `FR-dependency-seed` requires an idempotent seed function that inserts known dependency relationships (BUG-0010 blocked_by 5 items; 3 FR-to-FR dependencies) on server startup, after base items exist. No seed file exists anywhere in `Source/Backend/src/`. No `// Verifies: FR-dependency-seed` comment exists in the entire codebase. The `Plans/dependency-linking/requirements.md` explicitly marks this as `❌ Missing`.
- **Failure scenario:** A fresh deployment has an empty in-memory store. The `GET /api/work-items/:id` for BUG-0010 will return an empty `blockedBy` array when the spec requires it to return 5 blocker entries — making dependency UI and demo states incorrect.
- **Recommendation:** Create `Source/Backend/src/store/seed.ts` with an idempotent `seedDependencies()` function; wire it into `app.ts` startup; add `// Verifies: FR-dependency-seed` traceability comment.
- **Cross-ref:** Escalate to TheFixer (backend coder).

---

## QO-004: FR-dependency-metrics incomplete — `dependencyCheckDuration` histogram missing
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies four Prometheus metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` histogram, and `cycleDetectionEvents` counter. Only three are implemented in `metrics.ts` (lines 41–62). The `dependencyCheckDuration` histogram — which should measure per-dependency-check latency — is entirely absent. No `Histogram` import exists in `metrics.ts`.
- **Failure scenario:** `GET /metrics` does not emit `dependency_check_duration_seconds` (or similar). Any Grafana dashboard or alert relying on that histogram silently has no data.
- **Recommendation:** Add `import { Histogram } from 'prom-client'` and define `dependencyCheckDuration` histogram with appropriate buckets; instrument it in `services/dependency.ts` around `hasUnresolvedBlockers` and `detectCycle` calls; add `// Verifies: FR-dependency-metrics` comment.
- **Cross-ref:** TheFixer (backend coder).

---

## QO-005: OpenTelemetry tracing declared required but not instrumented
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/` (no OTel instrumentation)
- **Detail:** CLAUDE.md architecture rule: *"Use OpenTelemetry for distributed tracing — auto-instrument HTTP, database, and framework calls; propagate W3C `traceparent` header across service boundaries."* The `@opentelemetry/api` package appears in `Source/Backend/package-lock.json` (a transitive dep), but there is **zero OTel instrumentation code** in the backend source. No trace/span IDs appear in log output; no `traceparent` header is forwarded. The workflow-engine spec (FR-WF-013) only requires structured logging + Prometheus metrics, but CLAUDE.md's Observability section is listed as an architecture rule for ALL new code.
- **Recommendation:** If OTel is intentionally deferred for this service, document the exception in CLAUDE.md. Otherwise, add `@opentelemetry/sdk-node` and instrument with the Express HTTP middleware; propagate `traceparent` in intake routes (the likely external boundary).
- **Cross-ref:** TheFixer if instrumentation is in scope.

---

## QO-006: Logger lacks dev/prod mode switching (always emits JSON)
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/utils/logger.ts:17`
- **Detail:** CLAUDE.md logging rule: *"Use structured JSON logging in production, pretty-printing in development."* The `emit()` function at line 17 always calls `JSON.stringify()` regardless of `process.env.NODE_ENV`. There is no pretty-print path for local development. Developers running the server locally see raw JSON lines in the console instead of human-readable output.
- **Recommendation:** Add `NODE_ENV !== 'production'` branch in `emit()` to use a readable format (e.g., `pino-pretty`, or a simple `[LEVEL] message {ctx}` template).

---

## QO-007: eslint-disable-next-line in two production hooks (suppresses exhaustive-deps)
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist in production hooks. CLAUDE.md lists this as a pattern to flag. Suppressing exhaustive-deps can cause stale-closure bugs when dependencies change but the effect doesn't re-run.
- **Recommendation:** Audit whether the omitted dependencies are intentional (document why in a comment) or accidental (add them and verify the effect is idempotent). If intentional, use `useCallback`/`useRef` patterns instead of suppressing the lint rule.

---

## QO-008: Traceability enforcer scope gap — only checks most-recent plan
- **Severity:** P4
- **Category:** test-coverage
- **File:** `tools/traceability-enforcer.py:49`
- **Detail:** Without `--plan` or `--file` flags, the enforcer selects the **most-recently-modified** `requirements.md` in Plans/. The verification gate in CLAUDE.md (`python3 tools/traceability-enforcer.py`) will only ever check one plan at a time in automated CI. Dependency-linking requirements (16 FRs) are never checked by the default invocation if self-judging-workflow was touched more recently.
- **Recommendation:** Wrap the enforcer call in a shell loop: `for f in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$f" || exit 1; done`. Add this as the canonical verification gate in CLAUDE.md.

---

## JSON Summary

```json
{
  "audit_date": "2026-10-31",
  "spec_coverage": {
    "self_judging_workflow": { "total": 13, "covered": 13, "pct": 100 },
    "dependency_linking": { "total": 16, "covered": 15, "pct": 94 },
    "dev_workflow_platform": { "total": 69, "covered": 0, "pct": 0, "note": "targets portal/ not Source/ — not a regression" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Inspector config specs.dir maps to wrong application" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Route handlers bypass service layer — direct store imports" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed not implemented" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics" },
    { "id": "QO-005", "severity": "P3", "category": "architecture-violation", "title": "OpenTelemetry tracing not instrumented" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Logger always emits JSON — no dev pretty-print" },
    { "id": "QO-007", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable suppresses exhaustive-deps in 2 hooks" },
    { "id": "QO-008", "severity": "P4", "category": "test-coverage", "title": "Traceability enforcer only checks most-recent plan" }
  ],
  "grade": "C",
  "grade_rationale": "1 P1 config mismatch + 3 P2 spec/architecture violations"
}
```
