# Quality Oracle Findings — 2026-08-12

**Audit scope:** `Source/` (self-judging-workflow engine)  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Mode:** Full static audit (first run — no prior findings to re-verify)

---

## Spec Coverage

| Spec | FR IDs | Covered in Source/ | Coverage |
|------|--------|--------------------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001 to FR-WF-013) | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` | 69 (FR-001 to FR-069) | 0 | **0%** ⚠️ (implemented in `portal/`) |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001 to FR-TMP-010) | 0 | **0%** ⚠️ (implemented in `platform/`) |
| `Plans/dependency-linking/requirements.md` | FR-dependency-* (~14 IDs) | 13 of 14 | ~93% ✅ |

**Traceability enforcer (`python3 tools/traceability-enforcer.py`):** PASSED — but only against the most recently modified plan (self-judging-workflow). See QO-001.

---

## QO-001: Traceability Enforcer Blind to 7 of 8 Active Plans
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** The enforcer's fallback selects the **most recently modified** `requirements.md` automatically. With 8 plans containing requirements files, only the self-judging-workflow plan (13 FR-WF-* IDs) is checked at any run. The `Plans/dev-workflow-platform/requirements.md` alone has **103 FR IDs** — all silently skipped. Running `python3 tools/traceability-enforcer.py` and seeing PASSED gives false confidence of complete coverage. The actual multi-plan coverage is unknown.
- **Reproduction:** `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` — would fail (or show 0 matches, since that product is in `portal/`, not `Source/`). `python3 tools/traceability-enforcer.py --plan dependency-linking` — reports 7 "missing" IDs (some are false positives from work item IDs in acceptance criteria text).
- **Recommendation:** Change the default behavior to scan ALL `requirements.md` files under `Plans/` and aggregate results. Or add a `plans.active` list to `inspector.config.yml` and iterate over it. At minimum, update the CI step to pass `--plan self-judging-workflow` explicitly so the implicit fallback is not relied upon.
- **Cross-ref:** Impacts all pipeline QA gates that rely on enforcer as sole traceability check.

---

## QO-002: Direct Store Access from Route Handlers (Architecture Violation)
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44,73,79,134,142`, `Source/Backend/src/routes/intake.ts:19,42`, `Source/Backend/src/routes/workflow.ts:119,175,269`
- **Detail:** Three route handlers directly import and call `store.*` functions (`createWorkItem`, `findById`, `updateWorkItem`, `softDelete`, `findAll`). CLAUDE.md states: **"No direct DB calls from route handlers — use the service layer."** The store is the data access layer; routes should delegate to service functions. Only workflow actions (routing, assessment, dispatch) go through services. All CRUD and intake paths bypass the service layer entirely.
  - `workItems.ts` — 6 direct store calls in POST, GET, PATCH, DELETE handlers
  - `intake.ts` — 2 direct store calls in Zendesk and automated webhook handlers
  - `workflow.ts` — 4 direct `store.updateWorkItem()` calls in approve, reject, dispatch, re-queue handlers (in addition to the service calls for routing/assessment)
- **Recommendation:** Extract `workItemService.ts` with `createItem()`, `getItem()`, `listItems()`, `updateItem()`, `deleteItem()` functions. Move validation and business logic (input checks, soft-delete logic) into the service. Route handlers should call service functions only.
- **Cross-ref:** TheFixer — refactor task for backend-coder.

---

## QO-003: Logger Missing Development Pretty-Print Mode
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/utils/logger.ts`
- **Detail:** The logger always emits JSON-stringified output regardless of `NODE_ENV`. CLAUDE.md architecture rule: *"Use structured JSON logging in production, pretty-printing in development."* FR-003 acceptance criteria: *"All log output is structured JSON in NODE_ENV=production; logger is the only log sink."* The `LOG_LEVEL` env var is documented in CLAUDE.md but is never read by the logger implementation — all log levels are always emitted. Additionally, `Source/Backend/src/logger.ts` (the root-level compat shim) adds a second logger interface on top of `utils/logger.ts`, creating two ways to import the logger with different calling conventions.
- **Recommendation:** In `utils/logger.ts`, check `process.env.NODE_ENV !== 'production'` and emit human-readable output (e.g., `[INFO] message {context}`) in dev mode. Add `LOG_LEVEL` check to filter by level. Consolidate to one logger entry point and delete `src/logger.ts` (the compat shim), updating all imports.
- **Cross-ref:** QO-006 (duplicate logger).

---

## QO-004: OpenTelemetry Tracing Not Implemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/package.json`, `Source/Backend/src/app.ts`
- **Detail:** Both FR-WF-013 (acceptance criteria: *"Trace/span IDs appear in logs; traceparent header forwarded"*) and the CLAUDE.md architecture rules (*"Use OpenTelemetry for distributed tracing; auto-instrument HTTP, database, and framework calls; propagate W3C traceparent header across service boundaries"*) require OTel. No `@opentelemetry` packages are installed in `Source/Backend/package.json`. No OTel initialization exists in `app.ts`. No span creation exists anywhere in `Source/Backend/src/`. The log output contains no `traceId` or `spanId` fields.
- **Failure scenario:** Any distributed trace starting at the gateway will lose context when entering the backend. Log correlation across services is impossible. The W3C `traceparent` header is ignored on every incoming request.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, and `@opentelemetry/exporter-trace-otlp-grpc` (or stdout for dev). Initialize OTel before `app.listen()`. Inject `traceId`/`spanId` into log entries. Add `traceparent` propagation middleware.
- **Cross-ref:** TheFixer — backend-coder task. [ESCALATE consideration → TheGuardians if tracing gaps mask security audit trail].

---

## QO-005: Domain Spec FR-001 to FR-069 Orphaned from Source/
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical domain spec has 69 functional requirements (FR-001 to FR-069) covering a SQLite-backed product with feature requests, bugs, development cycles, votes, learnings, and features. Zero `// Verifies: FR-XXX` comments for these IDs exist anywhere in `Source/`. The `Source/` codebase implements a completely different product (in-memory work items, assessment pods, FR-WF-* IDs). The FR-001 to FR-069 product IS implemented — but in `portal/`, not `Source/`.

  **Current module mapping (actual vs. CLAUDE.md):**
  | Directory | CLAUDE.md says | Actual content |
  |-----------|---------------|----------------|
  | `portal/` | "Debug portal UI" | Full feature-request/bug/cycle product (FR-001 to FR-069) |
  | `Source/` | Application source | Self-judging workflow engine (FR-WF-001 to FR-WF-013) |

  The `Specifications/dev-workflow-platform.md` spec and `CLAUDE.md`'s description of `portal/` are both stale/misaligned. Either (a) the portal product replaced `Source/` and CLAUDE.md module ownership needs updating, or (b) the domain spec needs to be updated to describe the actual `Source/` product (the self-judging workflow).
- **Recommendation:** Decide the canonical product split and update CLAUDE.md accordingly. If `portal/` IS the dev-workflow-platform, rename its module entry to reflect that. Create `Specifications/self-judging-workflow-engine.md` as the domain spec for `Source/` with proper FR-WF-* IDs. Retire or archive the dev-workflow-platform spec from `Specifications/` if it only describes `portal/`.
- **Cross-ref:** Blocks all domain spec enforcement for Source/.

---

## QO-006: Duplicate Logger Abstraction
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/logger.ts` (wrapper) vs `Source/Backend/src/utils/logger.ts` (implementation)
- **Detail:** `src/logger.ts` is a compat shim that re-exports `utils/logger.ts` with a different interface (accepts `string | Record<string,unknown>` vs the underlying `string`). Two logger interfaces for one service. The comment says it was created for "backend-coder-2's workflow routes" — a temporary fix hardened into permanent structure. Routes that imported `../logger` get the compat interface; anything importing `../utils/logger` gets the raw interface. This divergence will cause confusion when onboarding new agents or adding log calls.
- **Recommendation:** Normalize `utils/logger.ts` to accept `string | Record<string,unknown>` natively, delete `src/logger.ts`, update all imports to `./utils/logger`.
- **Cross-ref:** QO-003 (logger fix opportunity).

---

## QO-007: Dependency-Linking Implementation Delta is Stale
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md` (Implementation Delta section)
- **Detail:** The plan's self-reported Implementation Delta lists three items as ❌ Missing:
  - `FR-dependency-frontend-tests` — but `Source/Frontend/tests/components/DependencySection.test.tsx` (172 lines) and `BlockedBadge.test.tsx` (27 lines) DO exist with `Verifies:` comments
  - `FR-dependency-api-types` — paths referenced are `portal/Shared/api.ts` (not `Source/Shared/`), so status unclear for Source/
  - `FR-dependency-seed` — references `portal/Backend/src/database/seed.ts` (portal-specific)
  
  The delta was written for `portal/` paths but the implementation moved to `Source/`. The static delta document drifted from reality.
- **Recommendation:** Update or remove the Implementation Delta section. The enforcer is the authoritative source; static delta tables become stale after any code change.

---

## QO-008: Two eslint-disable Suppressions in Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line`. This rule exists to prevent stale closure bugs. Suppressing it without a comment explaining why the dependency is intentionally excluded is a smell — it either hides a real bug or obscures intentional design.
- **Recommendation:** For each suppression: either add the missing dep to the array (if safe), use `useCallback`/`useMemo` to stabilize the dep, or add an explicit `// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>` comment explaining why omission is safe.

---

## JSON Summary

```json
{
  "audit_date": "2026-08-12",
  "spec_coverage": {
    "self_judging_workflow_plan": "100%",
    "domain_spec_fr001_fr069": "0% (implemented in portal/, not Source/)",
    "tiered_merge_pipeline_spec": "0% (implemented in platform/, not Source/)",
    "dependency_linking_plan": "~93%"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer blind to 7 of 8 active plans"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Direct store access from route handlers"},
    {"id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Logger missing dev pretty-print mode"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "OpenTelemetry tracing not implemented"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "Domain spec FR-001 to FR-069 orphaned from Source/"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Duplicate logger abstraction"},
    {"id": "QO-007", "severity": "P3", "category": "doc-stale", "title": "Dependency-linking implementation delta is stale"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Two eslint-disable suppressions in production code"}
  ],
  "grade": "C",
  "grade_rationale": "0 P1s in code (QO-001 is tooling), 4 P2s, 3 P3s. Grade C per grading config (max_p1:2, max_p2:15). However domain spec coverage (0% for FR-001/FR-069) artificially inflates the miss count — this is a product scope split, not a coding gap.",
  "escalations": []
}
```
