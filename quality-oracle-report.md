Now producing the full Quality Oracle report:

---

## Quality Oracle Findings — 2026-08-08

### Spec Coverage Summary

| Spec | FRs | Traced in Code | Enforcer Validates? |
|------|-----|---------------|---------------------|
| `Specifications/workflow-engine.md` / `Plans/self-judging-workflow` | 13 (FR-WF-*) | **13/13 — 100%** | ✅ PASSES |
| `Specifications/dev-workflow-platform.md` FR-001 — FR-069 | 69 | **69/69 — 100%** (in `portal/`) | ❌ BLIND |
| `Plans/duplicate-deprecated-status` FR-DUP-* | 13 | **12/13 — 92%** | ❌ BLIND |
| `Specifications/tiered-merge-pipeline.md` FR-TMP-* | 10 | **9/10 — 90%** | ❌ BLIND |

**Effective spec coverage: ~97.5%** — but the traceability gate produces a misleading pass signal on 4 of the 5 spec families.

---

### QO-001: Traceability Enforcer Has a Systematic Blind Spot — `portal/` Is Never Scanned

- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:60`
- **Detail:** The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The entire `portal/` application implements FR-001 through FR-095, FR-DUP-*, and FR-dependency-* requirements (70+ FRs), yet these are invisible to the gate. Running `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` reports FRs 17–32 as MISSING and prints `[MISSING] FR-XXX` for placeholder text, because it only scans `Source/`. The CI verification gate passes while large swathes of the spec are structurally un-auditable by tooling.
- **Recommendation:** Add `"portal"` to `source_dirs` in the enforcer, or accept a `--source-dirs` flag so each plan can specify its implementation home. Re-run enforcer against all three active plans (`dev-workflow-platform`, `duplicate-deprecated-status`, `dependency-linking`) after the fix.
- **Cross-ref:** TheFixer — single-line change in enforcer; TheATeam — verify portal/ traceability complete after fix.

---

### QO-002: Direct DB Calls in Route Handler — Architecture Rule Violated

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37,41,72`
- **Detail:** CLAUDE.md states "No direct DB calls from route handlers — use the service layer." `teamDispatches.ts` does `const db = getDb(); db.prepare(...).all(...)` inline inside both `GET /api/team-dispatches` and `POST /api/team-dispatches` handlers. This route has no service module — all SQL lives in the router. Only route file in `portal/Backend/src/routes/` with this pattern.
- **Failure scenario:** SQL changes or DB connection handling updates require touching the route directly; no service layer to unit-test the query logic in isolation.
- **Recommendation:** Extract a `teamDispatchService.ts` with `listDispatches(team?, limit)` and `recordDispatch(input)` functions; route handlers call service only.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: Duplicate WorkItemDetailPage Test File

- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two test files both claim `// Verifies: FR-WF-011` and test `WorkItemDetailPage`. They differ: the root-level file mocks additional API methods (`list`, `create`, `assess`) and is less comprehensive; the `pages/` file imports full enum types and uses `within()`. Both run under the same test suite, doubling runtime and creating divergent expectations on the same component. When the component changes, both files need updates — but which is authoritative?
- **Failure scenario:** A developer updates one file but not the other; CI passes because the updated file passes, the stale file may also pass by accident, creating false confidence.
- **Recommendation:** Delete `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (root-level); keep `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` as the canonical location matching the `tests/pages/` convention. Verify test count doesn't regress.

---

### QO-004: FR-DUP-06 Has No `// Verifies:` Traceability Comment

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Plans/duplicate-deprecated-status/requirements.md:16`
- **Detail:** FR-DUP-06 — "Detail endpoints always return the full item regardless of status" — has zero `// Verifies: FR-DUP-06` references anywhere in `portal/` or `Source/`. The behavior is likely implemented (detail endpoints query without a hidden filter), but there is no test or implementation comment asserting that a `duplicate` or `deprecated` item is returned on `GET /api/bugs/:id` or `GET /api/feature-requests/:id`. If the hidden-by-default filter (FR-DUP-05) is ever extended carelessly to the detail endpoint, there is no test to catch the regression.
- **Recommendation:** Add a test case in `portal/Backend/tests/` that GETs a `duplicate`-status item by ID and asserts it returns 200 with the full record. Tag `// Verifies: FR-DUP-06`.

---

### QO-005: FR-TMP-008 Has No `// Verifies:` Traceability Comment

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-008)
- **Detail:** FR-TMP-008 — "Worker Container Prerequisites: `gh` CLI installed in Dockerfile.worker, Playwright installable on demand, `GITHUB_TOKEN` passed to workers" — has no Verifies comment anywhere in the scanned codebase. Infrastructure requirements are hardest to trace because they live in `platform/` (excluded from solo-session pipeline work) or Docker config files. The requirement may be met, but there is no traceability anchor.
- **Recommendation:** Add a comment block in `platform/Dockerfile.worker` (or equivalent) like `# Verifies: FR-TMP-008 — gh CLI and Playwright prerequisites`. Alternatively, add an integration test that asserts `gh` is executable. Note: per CLAUDE.md, `platform/` changes are solo-session only.

---

### QO-006: Five Portal Files Exceed 500-Line Threshold

- **Severity:** P3
- **Category:** simplification
- **Files:**
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — **550 lines**
  - `portal/Frontend/src/components/bugs/BugDetail.tsx` — **546 lines**
  - `portal/Backend/src/services/cycleService.ts` — **526 lines**
  - `portal/Frontend/src/api/client.ts` — **525 lines**
  - `portal/Backend/src/services/featureRequestService.ts` — **506 lines**
- **Detail:** All five were recently modified (within the last 14 days). Large files accumulate responsibilities and slow test isolation. `FeatureRequestDetail.tsx` and `BugDetail.tsx` contain rendering, form logic, dependency section, approval workflow, and image attachment handling in a single component.
- **Recommendation:** Split each detail component into sub-components (`ActionsPanel`, `AttachmentsSection`, `DependenciesSection`). Extract `cycleService`'s `completeCycle` into a dedicated `completionService.ts`. Split `featureRequestService` at the boundary between CRUD and voting logic. The API client could be split into domain-area modules (`featureRequestsApi`, `bugsApi`, etc.) re-exported from a barrel.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-007 (P4): Duplicate Logger Abstraction in Source/Backend

- **Severity:** P4
- **Category:** simplification
- **Files:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger files serve the same purpose. `src/utils/logger.ts` is the real structured logger implementation. `src/logger.ts` is a compatibility wrapper created because "Backend-coder-2's workflow routes import `logger` as default from this module." This comment indicates a historical coordination error between coders, now frozen into the tree. Both files carry `// Verifies: FR-WF-013`.
- **Recommendation:** Migrate all imports to `utils/logger.ts` and delete `src/logger.ts`. One import path, one logger.

---

### QO-008 (P4): `eslint-disable` Comments Without Documented Justification

- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both silences are in `useEffect` dependency arrays. Suppressing this rule without explanation hides potential stale-closure bugs.
- **Recommendation:** Add an inline comment explaining why the dependency is intentionally omitted (e.g., `// intentionally omit X to avoid infinite loop — X is a callback ref`), or restructure the effect to not require the suppression.

---

### Summary JSON

```json
{
  "audit_date": "2026-08-08",
  "grade": "A",
  "spec_coverage_pct": 97,
  "p1_count": 0,
  "p2_count": 2,
  "p3_count": 4,
  "p4_count": 2,
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "architecture-violation", "file": "tools/traceability-enforcer.py", "line": 60, "title": "Enforcer never scans portal/ — 70+ FRs invisible to gate" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "file": "portal/Backend/src/routes/teamDispatches.ts", "line": 37, "title": "Direct DB calls in route handler — service layer bypassed" },
    { "id": "QO-003", "severity": "P3", "category": "test-coverage", "file": "Source/Frontend/tests/WorkItemDetailPage.test.tsx", "line": 1, "title": "Duplicate test file for WorkItemDetailPage — ambiguous canonical" },
    { "id": "QO-004", "severity": "P3", "category": "spec-drift", "file": "Plans/duplicate-deprecated-status/requirements.md", "line": 16, "title": "FR-DUP-06 has no Verifies comment — detail-always-returns untestable" },
    { "id": "QO-005", "severity": "P3", "category": "spec-drift", "file": "Specifications/tiered-merge-pipeline.md", "title": "FR-TMP-008 has no Verifies comment — worker prerequisites untraced" },
    { "id": "QO-006", "severity": "P3", "category": "simplification", "title": "5 portal files exceed 500-line threshold", "files": ["FeatureRequestDetail.tsx (550)", "BugDetail.tsx (546)", "cycleService.ts (526)", "client.ts (525)", "featureRequestService.ts (506)"] },
    { "id": "QO-007", "severity": "P4", "category": "simplification", "file": "Source/Backend/src/logger.ts", "title": "Two logger abstractions in Source/Backend — legacy wrapper unfixed" },
    { "id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable-next-line without justification in 2 frontend files" }
  ],
  "grading_basis": { "max_p1": 0, "max_p2": 2, "spec_coverage_pct": 97 },
  "grade_rationale": "0 P1s, 2 P2s (within A threshold of 3), spec coverage 97% (above 80% floor)"
}
```

---

**Grade: A** — No exploitable failures, all primary spec families have implementation coverage, two P2 architecture issues are actionable and scoped. The traceability enforcer blind spot (QO-001) is the most impactful fix: one line addition restores audit integrity for ~70 portal requirements.
