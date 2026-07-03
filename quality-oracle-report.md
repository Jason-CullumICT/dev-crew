---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec / Plan | IDs | Enforcer result (Source/ only) | True coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/` (FR-WF-*) | 13 | ✅ **100% PASS** | 100% in `Source/` |
| `Specifications/dev-workflow-platform.md` (FR-001–069 + FR-dependency-*) | ~80 | ❌ 76/76 MISSING (false) | ~95% implemented in `portal/` |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | ❌ 10/10 MISSING (false) | ~90% in `platform/` |

---

### QO-001: Traceability Enforcer Scope Gap — Portal and Platform Invisible
- **Severity:** P1
- **Category:** spec-drift / traceability
- **File:** `tools/traceability-enforcer.py:78` (scan dirs hardcoded to `["Source", "E2E"]`)
- **Detail:** The enforcer never scans `portal/` (the main app implementing FR-001–069) or `platform/` (the orchestrator implementing FR-TMP-001–010). Running the enforcer against `Specifications/dev-workflow-platform.md` reports **76 requirements as missing** — all false negatives. An agent checking the gate sees "FAIL" and believes 80+ requirements are unimplemented, when they exist in `portal/`. The gate is green for `Source/` but meaningless as a project-wide quality signal.
- **Recommendation:** Add `portal` and `platform` to the `source_dirs` list in `check_traceability()`, or add a separate gate invocation that targets each codebase root independently. At minimum, create a wrapper script that runs the enforcer once per implementation zone and reports combined coverage.
- **Cross-ref:** Inspector config `specs.dir` already declares `Specifications/` as the root. The enforcer silently ignores this — it always defaults to `Source/`.

---

### QO-002: FR-dependency-seed Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (file missing: `seed.ts`)
- **Detail:** `FR-dependency-seed` requires an idempotent seed file that inserts 9 known dependency relationships (BUG-0010 blocked-by BUG-0003 through BUG-0007; FR-0004 blocked-by FR-0003; FR-0005 blocked-by FR-0002; FR-0007 blocked-by FR-0003) on server startup. No `seed.ts` exists in `portal/Backend/src/database/` — only `connection.ts` and `schema.ts`. The `Plans/dependency-linking/requirements.md` delta table already flagged this as missing. Without seed data, the dependency feature cannot be demonstrated or tested against realistic baseline state, and the acceptance criteria for `GET /api/bugs/BUG-0010` returning 5 blocked_by items fails.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with the 9 dependency relationships, call it from `portal/Backend/src/index.ts` after schema migration, guard with existence check for idempotency.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: `UpdateBugInput` / `UpdateFeatureRequestInput` Missing `blocked_by` Field
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts:59` (`UpdateBugInput`), `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`)
- **Detail:** `FR-dependency-api-types` requires `blocked_by?: string[]` on both update input types in `portal/Shared/api.ts`. Currently, `UpdateBugInput` has `title?`, `description?`, `severity?`, `status?`, `source_system?`, `duplicate_of?`, `deprecation_reason?` — no `blocked_by`. `UpdateFeatureRequestInput` similarly omits it. The service layer (`bugService.ts:192`, `featureRequestService.ts:248`) DOES handle `blocked_by`, but the shared API contract type doesn't declare it — forcing frontend callers to use `as any` casts or rely on duck typing. This breaks end-to-end type safety.
- **Recommendation:** Add `blocked_by?: string[];  // Verifies: FR-dependency-api-types` to both interfaces in `portal/Shared/api.ts`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004: FR ID Namespace Collision — FR-070 Through FR-073 Assigned Twice
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Plans/image-upload/requirements.md:9` and `Plans/orchestrator-cycle-dashboard/requirements.md:19`
- **Detail:** FR-070, FR-071, FR-072, FR-073 each describe **two completely different features** in two different plans:
  - `image-upload` plan: FR-070 = `ImageAttachment` shared type, FR-071 = `ImageAttachmentListResponse`, FR-072 = `image_attachments` DB table, FR-073 = multer middleware
  - `orchestrator-cycle-dashboard` plan: FR-070 = `OrchestratorCyclesPage`, FR-071 = `CycleCard` component, FR-072 = stop button, FR-073 = `CycleLogStream` SSE component
  Both are implemented in `portal/` with the same ID. Any traceability tool will show false positives for both features when checking by ID. The traceability report `Plans/dev-workflow-platform/traceability-report-run6.md:42` already shows confusion, attributing FR-070 to `ImageAttachment` in one run and `OrchestratorCyclesPage` in another.
- **Recommendation:** Rename one feature set. Suggested: rename orchestrator-cycle-dashboard IDs to FR-090+ (or use `FR-OCD-001` namespace). Update all `// Verifies:` comments in portal code and the requirements file.
- **Cross-ref:** Coordinate with requirements-reviewer before renaming.

---

### QO-005: Routes Import Store Directly — Architecture Rule Violation
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** Three route files import `workItemStore` directly (`import * as store from '../store/workItemStore'`). CLAUDE.md rule: _"No direct DB calls from route handlers — use the service layer."_ The in-memory store is the persistence layer here (equivalent to DB); route handlers are meant to delegate to services. `workflow.ts` partially complies (it calls `routeWorkItem`, `assessWorkItem` services) but still calls `store.findById`, `store.getAll`, and `store.updateWorkItem` directly. `workItems.ts` uses the store for all five CRUD operations with no service intermediary. `intake.ts` calls `store.createWorkItem` directly.
- **Recommendation:** Extract a `workItemService.ts` that wraps the CRUD store calls, so route handlers only call `workItemService.*` functions. The store becomes an internal detail of the service layer. `workflow.ts` needs partial refactor for its direct store usages.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: FR-dependency Naming Schism Breaks Spec Traceability
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-dependency-api-client etc.), `Plans/dependency-linking/requirements.md` (FR-dependency-types etc.), `portal/` code (`FR-dependency-linking`)
- **Detail:** The same dependency-linking feature has three incompatible requirement ID conventions across the three tiers of project documentation. The spec uses 15 granular IDs (`FR-dependency-api-client`, `FR-dependency-api-types`, `FR-dependency-schema`, etc.). The plan uses 15 different granular IDs (`FR-dependency-types`, `FR-dependency-schema`, `FR-dependency-service`, etc.). Portal source code uses 4 coarse IDs (`FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-dispatch-gating`, `FR-dependency-cycle-detection`). No ID maps directly to any other tier. Spec → code traceability is **entirely broken** for this feature set despite the code being largely complete.
- **Recommendation:** Standardize on the plan IDs (they're most granular and self-documenting). Update `portal/` code Verifies comments to use plan IDs. Then update `Specifications/dev-workflow-platform.md` to use plan IDs as canonical.

---

### QO-007: Duplicate Test Files — Source/Frontend
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; also `WorkItemListPage.test.tsx` in both locations
- **Detail:** Two distinct test files exist for the same component in each case. The `tests/pages/` versions are more comprehensive (import actual enums and types, test additional scenarios via `within`), while the `tests/` root versions are older, shallower. Both run in the test suite, creating redundant coverage and risk of divergence. When the component changes, maintainers may update one file and miss the other.
- **Recommendation:** Delete the shallower root-level versions (`Source/Frontend/tests/WorkItemDetailPage.test.tsx`, `Source/Frontend/tests/WorkItemListPage.test.tsx`) and retain the `tests/pages/` versions as canonical.

---

### QO-008: Silenced React Hooks Lint Warnings Without Justification
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files use `// eslint-disable-next-line react-hooks/exhaustive-deps` with no comment explaining why the exhaustive-deps rule is intentionally suppressed. Unchecked dependency arrays can cause stale closures or infinite re-render loops. CLAUDE.md architecture rules require zero linting suppressions without explicit rationale.
- **Recommendation:** Either add a one-line comment explaining the intentional omission (e.g., `// intentional: searchTerm is a trigger, not a dependency — only fires on mount`) or refactor to satisfy the rule (e.g., use `useCallback` or split the effect).

---

### JSON Summary

```json
{
  "run_date": "2026-07-03",
  "spec_coverage": {
    "source_workflow_engine": { "total": 13, "traced": 13, "pct": 100 },
    "portal_dev_platform": { "total": 80, "traced_in_portal": 75, "enforcer_visible": 0, "note": "enforcer_blind_spot" },
    "platform_tiered_pipeline": { "total": 10, "traced_in_platform": 9, "enforcer_visible": 0, "note": "enforcer_blind_spot" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Enforcer blind to portal/ and platform/" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed seed.ts missing" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "UpdateBugInput/UpdateFeatureRequestInput missing blocked_by field" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-070–073 assigned to two different features" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Route handlers bypass service layer, import store directly" },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-dependency naming schism across spec/plan/code" },
    { "id": "QO-007", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable-next-line with no justification" }
  ],
  "grade": "C",
  "grade_rationale": "0 P1s exploitable, but 4 P2s (spec drift + architecture violation + missing seed + type gap) and enforcer covering only 1 of 3 implementation zones gives partial visibility at best"
}
```

---

**Grade: C** — The self-judging workflow engine (Source/) is clean and fully traced. The broader platform passes at the code level, but the tooling to *verify* that is broken (QO-001), two concrete spec gaps remain open (QO-002, QO-003), a requirement ID collision threatens future audits (QO-004), and routes bypass the service layer (QO-005). Fix QO-001 first — the enforcer's false "PASS" masks the actual state of the platform.
