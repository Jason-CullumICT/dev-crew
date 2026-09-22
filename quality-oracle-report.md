---

## Quality Oracle Findings

### Spec Coverage

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| Plans/self-judging-workflow (FR-WF-*) | 13 | 13 | **100%** ✅ |
| Plans/dependency-linking (FR-dependency-*) | 14 | 14 | **100%** ✅ |
| Specifications/dev-workflow-platform.md (FR-001..FR-069) | 76 | 76 in `portal/` | **N/A** — enforcer misconfigured |
| Specifications/tiered-merge-pipeline.md (FR-TMP-*) | 10 | 0 | **0%** — separate infrastructure concern |

---

### QO-001: Traceability Enforcer Regex Matches Phantom Requirements from NFR-* Text
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py:51`
- **Detail:** The regex `re.compile(r"FR-[A-Z0-9-]+")` has no word-boundary anchoring. The string "NFR-1" contains the substring "FR-1" starting at position 1, so `re.findall` extracts "FR-1" from "NFR-1". Running the enforcer against `Specifications/tiered-merge-pipeline.md` reports three phantom requirements `FR-1`, `FR-2`, `FR-3` that don't exist — they're artefacts from "NFR-1", "NFR-2", "NFR-3" in the Non-Functional Requirements section.
- **Failure Scenario:** `python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md` reports 13 missing; 3 of them (FR-1, FR-2, FR-3) are phantom — code can never satisfy them because no such IDs exist in the spec.
- **Recommendation:** Change the pattern to `r"\bFR-[A-Z0-9-]+"` (add word boundary `\b` before `FR`). This prevents matching `FR-` embedded in the middle of longer tokens like `NFR-1`.

---

### QO-002: Traceability Enforcer Doesn't Scan `portal/` — 76 Requirements Always False-Negative
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:70`
- **Detail:** `source_dirs = ["Source", "E2E"]` are hardcoded. `Specifications/dev-workflow-platform.md` defines FR-001 through FR-069 (and FR-dependency-*, FR-0001, etc.) which are implemented in `portal/Backend/` and `portal/Frontend/` — confirmed by `// Verifies: FR-022`, `// Verifies: FR-027`, etc. throughout `portal/`. Running the enforcer against dev-workflow-platform.md reports 76 failures, all false negatives. The enforcer cannot be used reliably for portal-spec verification.
- **Failure Scenario:** A coder runs `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` and gets 76 failures, creates panic, re-adds redundant traceability comments to Source/ for specs that belong to portal/.
- **Recommendation:** Add `portal/` to `source_dirs` OR support a per-spec scan-dir mapping in `inspector.config.yml` (`specs.dirs: portal/` for portal specs, `Source/` for workflow-engine specs). The config already has `source.dirs: [Source/]` — extend it to allow override per spec file.

---

### QO-003: `pending_dependencies` Status Claimed but Not Implemented in `Source/`
- **Severity:** P2
- **Category:** spec-drift / correctness
- **File:** `Source/Shared/types/workflow.ts:213`
- **Detail:** The comment `// Verifies: FR-dependency-dispatch-gating — Support for pending_dependencies blocking` appears immediately before `VALID_STATUS_TRANSITIONS`, implying the map supports `pending_dependencies` transitions. But `WorkItemStatus` enum has **no** `PendingDependencies` value, and `VALID_STATUS_TRANSITIONS` has no entry for it. The FR-dependency-dispatch-gating spec requires "unresolved blockers → set status to `pending_dependencies` instead." The Source/ implementation instead returns HTTP 409 from the `/dispatch` endpoint. The traceability comment creates a misleading compliance signal.
- **Failure Scenario:** An agent reading the traceability comment concludes `pending_dependencies` is handled; a downstream consumer or test expecting status=`pending_dependencies` after approval with blockers gets status=`approved` instead.
- **Recommendation:** Either (a) add `PendingDependencies = 'pending_dependencies'` to `WorkItemStatus`, add transitions in `VALID_STATUS_TRANSITIONS`, and implement the gating logic in `/approve` — OR (b) remove the misleading traceability comment and document that Source/ deliberately uses 409 instead of `pending_dependencies` status (acceptable divergence from portal/ spec behavior since these are different apps).

---

### QO-004: `/approve` Endpoint Has No Dependency Gating
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Source/Backend/src/routes/workflow.ts:94`
- **Detail:** FR-dependency-dispatch-gating says "Status transitions to `approved`/`in_development` check all blockers." The `/dispatch` endpoint (→ `in-progress`) correctly calls `computeHasUnresolvedBlockers` and returns 409 if blocked. But the `/approve` endpoint at line 94 performs no dependency check — it transitions any item from `proposed/reviewing/routing → approved` regardless of unresolved blockers. A fully-blocked item can reach `approved` status, then get blocked only at dispatch, leaving it stuck in `approved`.
- **Failure Scenario:** Item A is blocked by Item B (unresolved). User calls `/approve` on A → A reaches status `approved`. User calls `/dispatch` on A → gets 409. Item A is now stuck in `approved` with no automatic path forward. The cascade auto-dispatch only triggers when B resolves, but only dispatches already-`approved` items — so this path works, but the approve-then-block scenario creates a confusing UX and is inconsistent with spec intent.
- **Recommendation:** Add `computeHasUnresolvedBlockers` check in the `/approve` handler. If blockers exist, either reject with 409 or (once QO-003 is resolved) set status to `pending_dependencies` instead of `approved`.

---

### QO-005: `dependencyCheckDuration` Histogram Missing from Metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** FR-dependency-metrics requires 4 metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, and `dependencyCheckDuration` **histogram** ❌. The histogram is entirely absent. No `Histogram` is imported anywhere in Source/Backend. The traceability comment on the metrics file claims `FR-WF-013` compliance but doesn't reference `FR-dependency-metrics`, so this gap is invisible to the enforcer.
- **Failure Scenario:** The `GET /metrics` endpoint returns no `dependency_check_duration` bucket/count/sum. Any monitoring dashboard or SLO alert targeting this metric gets zero data. The requirement acceptance criterion ("All 4 metrics visible at `GET /metrics`") fails silently.
- **Recommendation:** Add `import { Histogram } from 'prom-client'` and define:
  ```ts
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency resolution checks',
    labelNames: ['operation'] as const,
    registers: [registry],
  });
  ```
  Then instrument `computeHasUnresolvedBlockers` and `isReady` calls.

---

### QO-006: No Route Latency Middleware — Architecture Rule Violation
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts`
- **Detail:** CLAUDE.md states "Auto-collect route latency via middleware" as a non-negotiable architecture rule. `Source/Backend/src/app.ts` has a request-logging middleware (line 15) but no latency timing. There is no `Histogram` in metrics.ts, no `res.on('finish')` or similar timing hook. `collectDefaultMetrics()` provides Node.js internals (GC, heap, event loop) but not per-route HTTP latency.
- **Failure Scenario:** Dashboard/monitoring shows no HTTP request duration percentiles. P95/P99 latency budget enforcement (configured in `inspector.config.yml` as 200ms/500ms) cannot be validated against actual metrics.
- **Recommendation:** Add a route latency middleware in `app.ts` using `prom-client`'s `Histogram`:
  ```ts
  const httpLatency = new Histogram({ name: 'http_request_duration_seconds', labelNames: ['method','route','status'] });
  app.use((req, res, next) => {
    const end = httpLatency.startTimer();
    res.on('finish', () => end({ method: req.method, route: req.route?.path ?? req.path, status: res.statusCode }));
    next();
  });
  ```

---

### QO-007: OpenTelemetry Not Initialized in Source/Backend
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts`
- **Detail:** CLAUDE.md architecture rules: "Use OpenTelemetry for distributed tracing. Auto-instrument HTTP, database, and framework calls. Add custom spans for critical paths. Propagate W3C `traceparent` header." No `@opentelemetry/*` package is in `Source/Backend/package.json` dependencies (only prom-client and express). The OTel package that appears in `package-lock.json` is a transitive dependency of prom-client, not an explicit instrumentation. Logs have no `trace_id` or `span_id` fields. No `traceparent` propagation.
- **Failure Scenario:** Cross-service debugging requires manual log correlation by timestamp. CLAUDE.md says "Auto-inject trace/span IDs from OpenTelemetry where available" — they're not available because OTel is not initialized.
- **Recommendation:** Add `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` to Source/Backend. Initialize in a `tracing.ts` loaded before app.ts via `--require ./dist/tracing.js`. This is a new FR candidate; suggest filing against workflow-engine spec.

---

### QO-008: Two ESLint Suppressions for `react-hooks/exhaustive-deps`
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63` and `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress the `react-hooks/exhaustive-deps` rule without explaining why. This rule catches stale closures in React hooks — suppressing it hides potential bugs where effect/callback dependencies are incomplete, causing the hook to use stale values. CLAUDE.md flags `eslint-disable` as a pattern to check.
- **Failure Scenario:** If the dependency array is intentionally incomplete (e.g., to run only on mount), the comment should document this. Without documentation, the next coder may add dependencies thinking they were forgotten, changing the behavior.
- **Recommendation:** Replace the bare `// eslint-disable-next-line react-hooks/exhaustive-deps` with an explanatory comment: `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit X to prevent infinite loop`. If the suppression is wrong, fix the hook instead.

---

### QO-009: Duplicate Test Files for Two Frontend Components
- **Severity:** P4
- **Category:** test-coverage (waste / drift risk)
- **Files:** 
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) AND `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Two test files cover each of these components. Both files carry `// Verifies: FR-WF-010` / `FR-WF-011` comments. Tests aren't identical but cover overlapping scenarios. Over time these will drift and contradict each other — one will be updated, the other forgotten.
- **Failure Scenario:** A bug is fixed and one test file is updated. The other file still has the old assertion and either passes (false negative) or fails (confusing double failure).
- **Recommendation:** Consolidate each pair into a single file. Keep the more comprehensive one (`tests/pages/` variants appear to be the newer/more complete set). Archive the root-level duplicates.

---

### JSON Summary

```json
{
  "audit_date": "2026-09-22",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "FR-WF_source": { "total": 13, "traced": 13, "pct": 100 },
    "FR-dependency_source": { "total": 14, "traced": 14, "pct": 100 },
    "dev-workflow-platform_portal": { "total": 76, "traced": 76, "note": "portal/ not in enforcer scope" },
    "tiered-merge-pipeline": { "total": 10, "traced": 0, "note": "platform/infrastructure concern, not in Source/ or portal/" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "pattern-violation", "file": "tools/traceability-enforcer.py:51", "title": "Regex matches FR-1 inside NFR-1 (phantom requirements)" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "file": "tools/traceability-enforcer.py:70", "title": "Enforcer doesn't scan portal/ — 76 requirements permanently show as untraced" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "file": "Source/Shared/types/workflow.ts:213", "title": "pending_dependencies status claimed but not in WorkItemStatus enum" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "file": "Source/Backend/src/routes/workflow.ts:94", "title": "/approve has no dependency gating (only /dispatch does)" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "file": "Source/Backend/src/metrics.ts", "title": "dependencyCheckDuration histogram missing (FR-dependency-metrics)" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "file": "Source/Backend/src/app.ts", "title": "No route latency middleware (CLAUDE.md rule)" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "file": "Source/Backend/src/app.ts", "title": "OpenTelemetry not initialized (CLAUDE.md rule)" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "files": ["Source/Frontend/src/hooks/useWorkItems.ts:63","Source/Frontend/src/components/DependencyPicker.tsx:82"], "title": "Undocumented eslint-disable for react-hooks/exhaustive-deps" },
    { "id": "QO-009", "severity": "P4", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" }
  ],
  "grade": "C",
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 3,
  "p4_count": 1,
  "escalations": []
}
```

---

**Grade: C** (1 P1, 4 P2 — see grading rubric in inspector.config.yml: grade A requires 0 P1, ≤3 P2, ≥80% spec coverage; grade B requires 0 P1, ≤8 P2, ≥60%; grade C allows ≤2 P1, ≤15 P2)

**Positive signals:**
- Zero `console.log` in production source (logger abstraction used throughout ✅)
- Zero empty catch blocks — all handlers log with full context ✅
- All list endpoints return `{data: T[]}` wrappers ✅
- No hardcoded secrets ✅
- No skipped tests ✅
- 100% traceability on the two active plans (FR-WF-* and FR-dependency-*) ✅
- All source files carry at least one `// Verifies:` comment ✅

**Route to fixing grade:**
- Fix QO-002 (enforcer scope) → P1 resolved → immediately improves to no P1
- Fix QO-003 + QO-004 (pending_dependencies alignment) → 2 P2 resolved
- Fix QO-001 (regex bug) → P2 resolved
- Fix QO-005 (histogram) → P2 resolved → at 0 P1, 0 P2 → grade A
