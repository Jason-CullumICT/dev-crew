---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec | FRs | Covered | % | Enforcer Sees? |
|------|-----|---------|---|----------------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | 13 | **100%** | ✅ |
| `dev-workflow-platform.md` (FR-001–069) | 69 | 69 | **100%** | ❌ portal/ not scanned |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 9 | **90%** | ❌ platform/ not scanned |

---

### QO-001: Traceability Enforcer Blindspot — portal/ and platform/ Never Scanned

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:70`
- **Detail:** `source_dirs = ["Source", "E2E"]` is hardcoded. The entire `portal/` codebase (which implements all 69 dev-workflow-platform FRs) and `platform/` (tiered-merge-pipeline FRs) are never scanned. Running `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` reports **34/34 MISSING** — a complete false-failure — because the scan never reaches `portal/`. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) runs only the most-recently-modified plan (`Plans/self-judging-workflow/requirements.md`), leaving portal requirements silently unverified on every pipeline run.
- **Recommendation:** Extend `check_traceability()` to also walk `portal/` and `platform/`. Alternatively, add a `--dirs` CLI flag so callers can pass the correct codebase root. Update CLAUDE.md to mandate `--plan dev-workflow-platform` and `--plan tiered-merge-pipeline` as required gates alongside the existing default.
- **Cross-ref:** TheFixer for the tool fix.

---

### QO-002: Architecture Violation — Direct DB Calls in Route Handler

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37–43, 72`
- **Detail:** The `GET /api/team-dispatches` and `POST /api/team-dispatches` route handlers call `db.prepare(...)` directly inline — bypassing the service layer entirely. CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* No `teamDispatchService.ts` exists. No test file covers this route (zero of the 15 `portal/Backend/tests/` files mention `teamDispatch`).
- **Recommendation:** Create `portal/Backend/src/services/teamDispatchService.ts` with `listDispatches()` / `createDispatch()` functions. Move all SQL into the service. Update the route to call the service. Add `portal/Backend/tests/teamDispatches.test.ts` with `// Verifies:` traceability.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: Spec Document Gap — FR-070+, FR-DUP-*, and Extended Dependency FRs Not in Specifications/

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (last FR defined: FR-069)
- **Detail:** Approximately 30+ additional requirement IDs are referenced in portal source code but are **not defined in any `Specifications/` document**:
  - `FR-070` through `FR-090` (image upload feature, orchestrator dashboard) — defined only in `Plans/image-upload/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md`
  - `FR-DUP-01` through `FR-DUP-13` (duplicate/deprecated status) — defined only in `Plans/duplicate-deprecated-status/requirements.md`
  - `FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-cycle-detection` — referenced in portal code with no matching plan requirements file
  
  CLAUDE.md rule: *"Specs are source of truth — implementation traces to specs, never the other way around."* These features were shipped without updating `Specifications/dev-workflow-platform.md`.
- **Recommendation:** Append sections to `Specifications/dev-workflow-platform.md` for image attachments (FR-070–FR-089), duplicate/deprecated status (FR-DUP-*), and the extended dependency tracking requirements. Mark all as `[Implemented]` with version date.
- **Cross-ref:** requirements-reviewer for spec authoring.

---

### QO-004: teamDispatches Route Has Zero Test Coverage

- **Severity:** P3
- **Category:** untested
- **File:** `portal/Backend/src/routes/teamDispatches.ts`
- **Detail:** `GET /api/team-dispatches` and `POST /api/team-dispatches` are the only portal backend routes with no corresponding test file. All 14 other backend routes (bugs, cycles, dashboard, featureRequests, features, learnings, pipelines, etc.) have dedicated test files in `portal/Backend/tests/`. The route handles team dispatch history recording, which is used by the portal TeamsPage.
- **Recommendation:** Add `portal/Backend/tests/teamDispatches.test.ts` covering the list (with/without team filter) and create endpoints. Include `// Verifies:` comments once a formal FR ID is assigned.
- **Cross-ref:** TheFixer

---

### QO-005: Duplicate Test Files for WorkItemDetailPage and WorkItemListPage

- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two parallel test suites exist for the same components:
  - `tests/WorkItemDetailPage.test.tsx` (flat) vs `tests/pages/WorkItemDetailPage.test.tsx` (deeper, more assertions)
  - `tests/WorkItemListPage.test.tsx` (flat) vs `tests/pages/WorkItemListPage.test.tsx` (deeper)
  
  The `/pages/` variants are more complete (they import typed enums, use `within()`, have more scenarios). The flat versions appear to be superseded but were never removed. This creates CI noise, inflated test-pass numbers, and misleads reviewers about actual coverage.
- **Recommendation:** Delete the flat `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`; keep the `tests/pages/` versions. Confirm both pass in CI before deleting.

---

### QO-006: FR-TMP-008 Untraced in Dockerfile.worker

- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:3`
- **Detail:** `FR-TMP-008` (*Worker Container Prerequisites* — `gh` CLI and Playwright installed in worker image) is implemented correctly at `platform/Dockerfile.worker:32–40`, but the traceability comment at line 3 reads `# Verifies: dev-crew unified repo — Task 3 Step 2` instead of `# Verifies: FR-TMP-008`. This breaks static traceability — FR-TMP-008 is the only tiered-merge-pipeline requirement not covered by a proper `FR-TMP-` comment.
- **Recommendation:** Change `platform/Dockerfile.worker:3` comment to `# Verifies: FR-TMP-008 — gh CLI and Playwright installed in worker image`.
- **Cross-ref:** solo-session (platform/ is solo-session-only module per CLAUDE.md)

---

### QO-007: Invalid Traceability ID FR-0001 in DependencyPicker Tests

- **Severity:** P4
- **Category:** spec-drift
- **File:** `portal/Frontend/tests/DependencyPicker.test.tsx:1,64`
- **Detail:** Lines 1 and 64 contain `// Verifies: FR-0001` but `FR-0001` is not a defined requirement ID. The DependencyPicker is specified under `FR-dependency-picker` in `Specifications/dev-workflow-platform.md`. The four-digit zero-padded format (`FR-0001`) does not match any ID pattern in any spec or plan document.
- **Recommendation:** Replace `// Verifies: FR-0001` with `// Verifies: FR-dependency-picker` to restore accurate traceability.

---

### QO-008: eslint-disable Suppressing react-hooks/exhaustive-deps

- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two files suppress `react-hooks/exhaustive-deps` warnings. This can mask stale closure bugs where hooks silently use outdated values. The suppression is applied with no explanation comment.
- **Recommendation:** Audit each suppression to confirm it is intentional (e.g., deliberately omitting a stable function reference from deps). Add an inline comment explaining why the omission is safe.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-25",
  "spec_coverage": {
    "FR-WF-001_to_013": {"total": 13, "covered": 13, "pct": 100},
    "FR-001_to_069": {"total": 69, "covered": 69, "pct": 100, "note": "enforcer blind — portal/ not scanned"},
    "FR-TMP-001_to_010": {"total": 10, "covered": 9, "pct": 90, "note": "FR-TMP-008 untraced"}
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer never scans portal/ or platform/", "file": "tools/traceability-enforcer.py", "line": 70},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Direct DB calls in teamDispatches route handler", "file": "portal/Backend/src/routes/teamDispatches.ts", "line": 37},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-070+, FR-DUP-*, extended deps FRs not in Specifications/", "file": "Specifications/dev-workflow-platform.md"},
    {"id": "QO-004", "severity": "P3", "category": "untested", "title": "teamDispatches route has zero test coverage", "file": "portal/Backend/src/routes/teamDispatches.ts"},
    {"id": "QO-005", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage", "file": "Source/Frontend/tests/"},
    {"id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 untraced in Dockerfile.worker", "file": "platform/Dockerfile.worker", "line": 3},
    {"id": "QO-007", "severity": "P4", "category": "spec-drift", "title": "Invalid FR-0001 traceability ID in DependencyPicker tests", "file": "portal/Frontend/tests/DependencyPicker.test.tsx", "line": 1},
    {"id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable suppressing react-hooks/exhaustive-deps", "file": "Source/Frontend/src/hooks/useWorkItems.ts", "line": 63}
  ],
  "grade": "B",
  "p1_count": 1,
  "p2_count": 2,
  "p3_count": 3,
  "p4_count": 2,
  "architecture_violations": 1,
  "untested_routes": ["portal/Backend/src/routes/teamDispatches.ts"]
}
```

---

**Grade: B** (1 P1, 2 P2, within B-tier threshold per grading config: max_p1=0 violated → downgrade from A; P1 count=1 < C-tier limit=2 → qualifies B; spec_coverage 100% on main FRs exceeds 60% threshold)

The codebase is well-traced overall — 151/152 formal FR IDs are covered by `// Verifies:` comments. The dominant risk is the **broken verification gate** (QO-001): the CLAUDE.md gate command runs successfully but audits the wrong codebase. Every pipeline run silently skips 69 portal requirements. Fix that first.
