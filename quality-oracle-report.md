Now the full audit report:

---

## Quality Oracle Findings — Full Audit · 2026-07-14

---

### Spec Coverage Summary

| Spec Domain | FR Count | Traced | Coverage | Enforcer Result |
|---|---|---|---|---|
| Self-Judging Workflow (`FR-WF-*`) | 13 | 13 | **100%** | ✅ PASS |
| Dependency Tracking (`FR-dependency-*`) | 16 | 13 | **81%** | ❌ FAIL (+ false positives) |
| Tiered Merge Pipeline (`FR-TMP-*`) | 10 | 9* | **90%** | ⚠️ Unenforced (no requirements.md) |
| Portal Platform (`FR-001 — FR-069`) | 69 | Unknown | **?%** | ⚠️ Enforcer blind to `portal/` |

> *FR-TMP-008 implemented in `Dockerfile.worker` but lacks `// Verifies: FR-TMP-008` comment.

**3 open unimplemented requirements** confirmed from Plans/dependency-linking. **Prior run learnings: none** (first audit).

---

### QO-001 — FR-dependency-api-types Not Implemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts:32,59`
- **Detail:** `UpdateFeatureRequestInput` (line 32) and `UpdateBugInput` (line 59) lack the required `blocked_by?: string[]` field. Plans/dependency-linking/requirements.md §Implementation Delta flags this as `❌ Missing`. The absence forces a type-safety bypass in the frontend: `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291 and 293 use `as any` casts (`bugs.update(itemId, { blocked_by: blockerIds } as any)`) — a direct symptom. TypeScript type safety is broken end-to-end for the PATCH dependency flow.
- **Recommendation:** Add `blocked_by?: string[];` to both interfaces in `portal/Shared/api.ts`, then remove the `as any` casts in `DependencyPicker.tsx`.
- **Cross-ref:** TheFixer (type-safe PATCH route) · [ESCALATE → TheFixer]

---

### QO-002 — FR-dependency-seed Not Implemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (file `seed.ts` absent)
- **Detail:** The dependency-linking spec requires an idempotent seed script placing 7 known dependency links (BUG-0010 blocked by 5 bugs, plus FR-FR dependency chains) to be wired into server startup. No `seed.ts` exists in `portal/Backend/src/database/`. Fresh environments start with no seeded dependency data, which prevents manual QA and makes integration tests that rely on seed data fail silently.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` per the spec and wire it into `portal/Backend/src/index.ts` startup after schema init. Mark idempotent (check for existence before inserting).
- **Cross-ref:** TheFixer · [ESCALATE → TheFixer]

---

### QO-003 — FR-dependency-frontend-tests Incomplete
- **Severity:** P2
- **Category:** untested
- **File:** `portal/Frontend/tests/` (DependencySection.test.tsx and BlockedBadge.test.tsx absent)
- **Detail:** Plans/dependency-linking/requirements.md requires `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx`. Neither exists. Only `DependencyPicker.test.tsx` (321 lines) is present. `DependencySection` (226 lines, 5 cases including pending-state highlighting and chip navigation) and `BlockedBadge` (70 lines, 3 badge states) have zero test coverage. These are user-visible state-machine components — an unresolved blocker that silently renders as amber is a regression risk.
- **Recommendation:** Create both missing test files per the spec. Each test must carry `// Verifies: FR-dependency-section` or `// Verifies: FR-dependency-blocked-badge` comments to satisfy the traceability gate.
- **Cross-ref:** TheFixer · [ESCALATE → TheFixer]

---

### QO-004 — Portal Routes Violate "No Direct DB Calls From Route Handlers"
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/bugs.ts:38` (and all other portal route files)
- **Detail:** Architecture rule: _"No direct DB calls from route handlers — use the service layer."_ Every portal route handler calls `const db = getDb()` and passes `db` to service functions (e.g., `listBugs(db, ...)`, `createBug(db, ...)`). The service layer is thereby not self-contained — it requires callers to manage the DB lifecycle. Routes have 14+ `getDb()` call sites in `bugs.ts` alone. Same pattern found in `featureRequests.ts`. This means:
  - Route handlers are coupled to the DB abstraction layer
  - Service functions cannot be unit-tested without supplying a DB stub
  - Any connection pool or transaction management must be threaded from routes
- **Recommendation:** Refactor service functions to call `getDb()` internally, removing `db` parameters from all service signatures. Route handlers should call services without any DB awareness.
- **Cross-ref:** TheFixer (refactor portal service layer)

---

### QO-005 — 164 `console.log` Calls in Orchestrator (Architecture Rule Violation)
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `platform/orchestrator/lib/workflow-engine.js` (164 occurrences)
- **Detail:** Architecture rule: _"Use the project's logger abstraction, never `console.log`."_ The orchestrator workflow engine uses `console.log` pervasively for progress reporting (e.g., `console.log(`[${run.id}] Risk level: ${run.riskLevel}`)`). These produce unstructured output with no trace/span IDs, no log levels, and no structured fields — violating the observability requirement. In a containerised pipeline environment this makes log aggregation and debugging significantly harder.
- **Recommendation:** Introduce a logger abstraction in `platform/orchestrator/lib/` (structured JSON in production, coloured in dev), then replace all `console.log`/`console.error` calls. `platform/` is solo-session-only — this cannot go through team pipeline.
- **Cross-ref:** Solo session only (platform/ is pipeline infrastructure)

---

### QO-006 — Traceability Enforcer Has False Positives and Blind Spots
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py:63-65`
- **Detail:** Three systemic defects in the verification gate:

  1. **Blind to `portal/`**: The enforcer scans only `Source/` and `E2E/`. All portal code (implementing FR-001 to FR-069) is invisible. Running the gate passes even if portal has zero traceability.

  2. **False positives from seed-data context**: Regex `FR-[A-Z0-9-]+` matches item IDs in narrative text (e.g. `FR-0004 blocked_by FR-0003` in the dependency-linking requirements). Running `python3 tools/traceability-enforcer.py --plan dependency-linking` reports 7 MISSING requirements (`FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085`) — none of which are actual requirement IDs. The gate produces noise that erodes trust.

  3. **Can't target Specifications/ directly**: FR-TMP-001 to FR-TMP-010 live in `Specifications/tiered-merge-pipeline.md` with no corresponding `Plans/tiered-merge-pipeline/requirements.md`, so they cannot be enforced at all.

- **Recommendation:**
  - Add `portal/` and `platform/` to `source_dirs` in the enforcer
  - Anchor the FR ID regex more tightly: `(?<!\w)FR-(?!0+\b)[A-Z][A-Z0-9-]*` (require at least one letter after `FR-`) or use a `# Requirements` section parser
  - Support `--file` path to `Specifications/` files as first-class input (already partially implemented — document it)

---

### QO-007 — Duplicate Frontend Test Files (FR-WF-010 and FR-WF-011)
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) + `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both files test `FR-WF-010` with near-identical test suites. Same pattern for `WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines) for `FR-WF-011`. Combined: ~1,309 lines across four files covering just two requirements. Running the test suite runs each scenario twice, doubling maintenance burden. Divergence between the two copies will silently mask failures.
- **Recommendation:** Remove the root-level copies (`Source/Frontend/tests/WorkItemListPage.test.tsx`, `WorkItemDetailPage.test.tsx`) and retain the `tests/pages/` versions as the canonical location.

---

### QO-008 — FR-TMP-008 Implemented Without Traceability Comment
- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:1`
- **Detail:** `Dockerfile.worker` installs `gh` CLI (line 32) and Playwright/Chromium (lines 38–40) — fully satisfying FR-TMP-008 (Worker Container Prerequisites). However the file header reads `// Verifies: dev-crew unified repo — Task 3 Step 2` rather than `// Verifies: FR-TMP-008`. If enforcement is ever extended to `platform/`, this requirement will appear unimplemented.
- **Recommendation:** Update the header comment to `# Verifies: FR-TMP-008 — gh CLI and Playwright installed in worker container`.

---

### QO-009 — `DebugPortalPage.tsx` Has No FR Traceability
- **Severity:** P3
- **Category:** untested
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** Recently modified file (within 14 days). Header reads `// Verifies: dev-crew debug portal — embedded container-test viewer` — a freeform description, not a `FR-XXX` reference. The page routes the portal URL via `VITE_PORTAL_URL` env var, which is itself functional behaviour that could be traced to a spec requirement.
- **Recommendation:** Identify or create the FR that governs the embedded portal page (likely a UI requirement in `workflow-engine.md` or `dev-workflow-platform.md`) and add a proper `// Verifies: FR-XXX` comment.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-14",
  "grade": "B",
  "spec_coverage": {
    "FR-WF": { "total": 13, "traced": 13, "pct": 100 },
    "FR-dependency": { "total": 16, "traced": 13, "pct": 81 },
    "FR-TMP": { "total": 10, "traced": 9, "pct": 90 },
    "FR-001-069-portal": { "total": 69, "traced": "unknown", "pct": "unmeasured" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift",           "file": "portal/Shared/api.ts" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift",           "file": "portal/Backend/src/database/seed.ts (missing)" },
    { "id": "QO-003", "severity": "P2", "category": "untested",             "file": "portal/Frontend/tests/ (DependencySection + BlockedBadge missing)" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","file": "portal/Backend/src/routes/bugs.ts:38" },
    { "id": "QO-005", "severity": "P2", "category": "pattern-violation",    "file": "platform/orchestrator/lib/workflow-engine.js (164 console.log)" },
    { "id": "QO-006", "severity": "P2", "category": "pattern-violation",    "file": "tools/traceability-enforcer.py" },
    { "id": "QO-007", "severity": "P3", "category": "test-coverage",        "file": "Source/Frontend/tests/WorkItemListPage.test.tsx (duplicate)" },
    { "id": "QO-008", "severity": "P3", "category": "spec-drift",           "file": "platform/Dockerfile.worker:1" },
    { "id": "QO-009", "severity": "P3", "category": "untested",             "file": "Source/Frontend/src/pages/DebugPortalPage.tsx" }
  ],
  "p1_count": 0,
  "p2_count": 6,
  "p3_count": 3,
  "enforcer_gate": "PASS (self-judging-workflow) / FAIL with false-positives (dependency-linking) / UNENFORCED (tiered-merge-pipeline)"
}
```

---

## Routing

| Finding | Route |
|---------|-------|
| QO-001, QO-002, QO-003, QO-007 | **[ESCALATE → TheFixer]** — incomplete spec implementation |
| QO-004, QO-005, QO-006, QO-008, QO-009 | **TheFixer / Solo-session** — architecture hygiene |

**Grade: B** — 0 P1s · 6 P2s (≤8 threshold) · 90% verifiable spec coverage (≥60% threshold). Grade would reach A with ≤3 P2s — resolving QO-001/002/003 (the three concrete missing implementations) would close that gap.
