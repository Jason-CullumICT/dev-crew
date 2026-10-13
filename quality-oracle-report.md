Now the full report:

---

## Quality Oracle Findings — 2026-10-13

### Spec Coverage: ~97.8%
**137 total requirements** across all plans and specs  
**134 traced to source** (portal/ + Source/)  
**3 unimplemented or untraced**

> ⚠️ **Critical caveat**: The traceability gate (`python3 tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. For 6 of 8 plans, whose implementations live in `portal/`, the enforcer produces **false FAILURE**. The self-judging-workflow plan passes correctly because it IS in `Source/`. The real coverage is 97.8%, not 0%.

---

### QO-001: Traceability Enforcer Blind Spot — portal/ Excluded
- **Severity:** P1
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:71`
- **Detail:** The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The `portal/` directory contains the full dev-workflow-platform implementation with 1,074 `Verifies:` comments covering FR-001 through FR-095 and FR-DUP-01 through FR-DUP-13. Running the enforcer against any portal-based plan (6 of 8 plans: `dev-workflow-platform`, `dependency-linking`, `image-upload`, `duplicate-deprecated-status`, `orchestrated-dev-cycles`, `orchestrator-cycle-dashboard`) exits with code 1 and reports every FR as missing — a **false negative**. The verification gate is silently broken for the majority of product plans.
- **Failure scenario:** CI runs `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` → reports all 34 FRs missing → gate fails → engineers conclude there is no traceability → lose confidence in gate → stop maintaining it.
- **Recommendation:** Add `"portal"` to `source_dirs` list at line 71, or better, read the list from the inspector config or from an env var. One-line fix: `source_dirs = ["Source", "E2E", "portal"]`.
- **Cross-ref:** QO-002 (inspector config also excludes portal/)

---

### QO-002: Inspector Config Excludes portal/ From Source Dirs
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Teams/TheInspector/inspector.config.yml`
- **Detail:** `source.dirs` is `["Source/"]` only. `portal/` has 6,300+ lines of production TypeScript (31 source files, 15 test files, full routes/services/middleware/database layer). All inspector audits — quality-oracle, red-teamer, chaos-monkey, performance — are scoped to `Source/` and are therefore blind to the primary product implementation.
- **Failure scenario:** Quality oracle reports "zero architecture violations in portal/" because it never looks there.
- **Recommendation:** Add `"portal/"` to `source.dirs` and add `"portal/Backend/tests/"` and `"portal/Frontend/tests/"` to `source.test_dirs`.
- **Cross-ref:** QO-001

---

### QO-003: FR-dependency-api-types Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts` (`UpdateBugInput`, `UpdateFeatureRequestInput`)
- **Detail:** FR-dependency-api-types requires `blocked_by?: string[]` in both update input types so the frontend can type-safely PATCH dependencies without casting. The `Plans/dependency-linking/requirements.md` Implementation Delta table (written by the implementers) marks this as `❌ Missing`. Grep confirms `blocked_by` is absent from portal/Shared/api.ts. The DependencyPicker component currently uses `as any` to work around the missing type.
- **Failure scenario:** TypeScript build passes only because of `as any`; a future refactor removing that cast exposes untyped PATCH calls that silently send wrong-shaped bodies.
- **Recommendation:** Add `blocked_by?: string[]` to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`, then remove the `as any` cast in DependencyPicker.tsx. Route to **TheFixer** (backend-coder scope, ~S weight).

---

### QO-004: FR-dependency-seed Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (seed.ts absent)
- **Detail:** FR-dependency-seed requires an idempotent seed function that inserts 4 known dependency relationships on startup (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003). Only `connection.ts` and `schema.ts` exist in `portal/Backend/src/database/`. No `seed.ts`. This is confirmed in the Implementation Delta table as `❌ Missing`.
- **Failure scenario:** Fresh environment has no dependency relationships seeded; integration tests and manual demos that rely on known seed state fail or show empty dependency sections.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent dependency insertion, wire into `portal/Backend/src/index.ts` startup after schema migration. Route to **TheFixer** (backend-coder scope, ~S weight).

---

### QO-005: FR-DUP-06 Untraced — Detail Endpoint Always Returns Full Item
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/routes/featureRequests.ts`
- **Detail:** FR-DUP-06 states "Detail endpoints always return the full item regardless of status" (i.e., `GET /api/bugs/:id` and `GET /api/feature-requests/:id` must NOT apply hidden-item filtering). No `// Verifies: FR-DUP-06` comment exists anywhere in the codebase. All other FR-DUP-01 through FR-DUP-13 requirements except FR-DUP-06 have traceability comments in portal/.
- **Failure scenario:** If a developer later refactors detail endpoints to share the list-filtering code path, they'll have no test explicitly verifying this invariant and may inadvertently hide duplicate/deprecated items from direct GET requests.
- **Recommendation:** Add `// Verifies: FR-DUP-06` comment to the `GET /:id` handler in both bugs.ts and featureRequests.ts, and add a test case with the traceability comment in `portal/Backend/tests/bugs.test.ts` and `portal/Backend/tests/featureRequests.test.ts`.

---

### QO-006: CLAUDE.md Mislabels portal/ Module Ownership
- **Severity:** P2
- **Category:** doc-stale / architecture-violation
- **File:** `CLAUDE.md` (module ownership table)
- **Detail:** The module table labels `portal/` as "Debug portal UI" owned by `frontend-coder`. In reality, `portal/` is the primary dev-workflow-platform product implementation: it contains a full Express backend (`portal/Backend/`), React frontend (`portal/Frontend/`), and shared types (`portal/Shared/`). All FR-001 through FR-095 are implemented there. Backend-coder agents that see "frontend-coder" as the owner of portal/ will refuse to make backend changes to `portal/Backend/` — violating the module ownership rules while leaving the actual owner definition incorrect.
- **Failure scenario:** A pipeline agent dispatched to fix a bug in `portal/Backend/src/services/bugService.ts` reads the module table, sees "portal/ → frontend-coder," and declines the task or passes it to the wrong agent.
- **Recommendation:** Update the module table to reflect the true structure:
  - `portal/Backend/` → `backend-coder`
  - `portal/Frontend/` → `frontend-coder`  
  - `portal/Shared/` → `api-contract`

---

### QO-007: workflow-engine.md Spec Has No FR IDs — Not Enforceable
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/workflow-engine.md`
- **Detail:** The workflow-engine spec defines the complete domain model, routing rules, assessment pod, and API shape for the self-judging workflow — but uses no `FR-XXX` numbering. The enforcer cannot be run against it directly. The plan-level `Plans/self-judging-workflow/requirements.md` bridges this with FR-WF-001 to FR-WF-013, but the connection between spec and plan is implicit and manual.
- **Failure scenario:** A future agent reading `Specifications/workflow-engine.md` cannot verify whether any given requirement is implemented without cross-referencing the plan manually.
- **Recommendation:** Add FR-WF-001 through FR-WF-013 IDs to the relevant sections of `Specifications/workflow-engine.md` so the spec itself becomes traceable.

---

### QO-008: eslint-disable Suppressions — react-hooks/exhaustive-deps
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `portal/Frontend/src/hooks/useApi.ts:35`
- **Detail:** Three `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist. These hooks disable the exhaustive-deps rule, which guards against stale closure bugs in `useEffect`. Each could be a real bug (missing dependency causes stale data) or a deliberate optimization (stable callback/ref that doesn't need listing). They are not documented.
- **Failure scenario:** Stale dependency in a `useEffect` causes the component to display outdated data without re-fetching when a dependency changes.
- **Recommendation:** For each suppression: either refactor the `useEffect` to include all dependencies (using `useCallback`/`useMemo` for stable callbacks), or add an inline comment documenting *why* the dependency is intentionally omitted.

---

### QO-009: Two Service Files Exceed 500-Line Threshold
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
- **Detail:** Both exceed the 500-line guideline indicating a file may need splitting. Both files combine multiple distinct concerns (CRUD, state machine transitions, cross-entity side effects).
- **Recommendation:** Extract sub-concerns into smaller service modules (e.g., cycleService could split into `cycleLifecycleService` and `cycleTicketService`).

---

### Summary JSON

```json
{
  "audit_date": "2026-10-13",
  "grade": "C",
  "spec_coverage_pct": 97.8,
  "total_requirements": 137,
  "traced_requirements": 134,
  "untraced_requirements": 3,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Enforcer blind spot: portal/ not scanned", "file": "tools/traceability-enforcer.py", "line": 71},
    {"id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Inspector config excludes portal/ from source.dirs", "file": "Teams/TheInspector/inspector.config.yml"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-api-types unimplemented (blocked_by missing from Update types)", "file": "portal/Shared/api.ts"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed unimplemented (no seed.ts)", "file": "portal/Backend/src/database/"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-DUP-06 untraced — no Verifies comment on detail endpoint invariant", "file": "portal/Backend/src/routes/bugs.ts"},
    {"id": "QO-006", "severity": "P2", "category": "doc-stale", "title": "CLAUDE.md mislabels portal/ as 'Debug portal UI'", "file": "CLAUDE.md"},
    {"id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "workflow-engine.md has no FR IDs — cannot be enforced", "file": "Specifications/workflow-engine.md"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "3x eslint-disable for react-hooks/exhaustive-deps (potential stale closure bugs)", "files": ["Source/Frontend/src/hooks/useWorkItems.ts", "Source/Frontend/src/components/DependencyPicker.tsx", "portal/Frontend/src/hooks/useApi.ts"]},
    {"id": "QO-009", "severity": "P3", "category": "pattern-violation", "title": "Two service files exceed 500 lines (cycleService.ts: 526, featureRequestService.ts: 506)", "files": ["portal/Backend/src/services/cycleService.ts", "portal/Backend/src/services/featureRequestService.ts"]}
  ],
  "positive_signals": [
    "No console.log in production source (both Source/ and portal/)",
    "No hardcoded secrets",
    "No empty catch blocks",
    "No skipped/todo tests",
    "No TODO/FIXME/HACK comments",
    "FR-001 to FR-069 and FR-070 to FR-095: 100% covered in portal/",
    "FR-WF-001 to FR-WF-013: 100% covered in Source/",
    "All catch blocks log with full context before returning 500 error JSON"
  ],
  "escalations": []
}
```

---

**Grade rationale:** Grade C per config thresholds — 2 P1 findings exceed the A/B ceiling. Real functional coverage is excellent (97.8%), but the enforcement infrastructure itself has a critical blind spot that could erode that coverage silently over time.

**Routing:** QO-001 and QO-002 → solo session (tools/ and Teams/ are outside pipeline scope). QO-003 and QO-004 → TheFixer (backend-coder). QO-005 → TheFixer (backend-coder + test addition). QO-006 → solo session (CLAUDE.md edit).
