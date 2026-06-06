# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-06 — Full Audit

### Spec Coverage Trend

| Plan | FRs in Spec | FRs in Code | Coverage | Enforcer Result |
|------|-------------|-------------|----------|-----------------|
| self-judging-workflow (Source/) | 13 | 13 | 100% | PASS ✅ |
| dev-workflow-platform (portal/) | 69 | 69 | 100% | FALSE FAIL ⚠️ (wrong scan dir) |
| dependency-linking (portal/) | 16 | 13 | 81% | FALSE FAIL ⚠️ (wrong scan dir) |
| duplicate-deprecated-status (portal/) | 13 | 13 | 100% | FALSE FAIL ⚠️ (wrong scan dir) |
| tiered-merge-pipeline (platform/) | 10 | 10 | 100% | NOT CHECKED ⚠️ (no requirements.md) |
| image-upload (portal/) | 20 | 20 | 100% | FALSE FAIL ⚠️ |
| orchestrator-cycle-dashboard (portal/) | 7 | 7 | 100% | FALSE FAIL ⚠️ |
| dev-cycle-traceability (portal/) | 20 | 20 | 100% | FALSE FAIL ⚠️ |

**Overall implementation coverage: ~97%** (only 3 dependency-linking items genuinely open)

### Critical Discovery: Enforcer Blind Spot

`tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`.
- ALL portal/ plans (dev-workflow-platform, dependency-linking, image-upload, etc.) give FALSE FAILURE
- ALL platform/ plans (tiered-merge-pipeline) are completely unchecked
- The default run (`python3 tools/traceability-enforcer.py`) only checks the most recently modified plan in Plans/ — currently `self-judging-workflow` — giving FALSE CONFIDENCE

**Fix needed**: Add `"portal"` and `"platform"` to the enforcer's `source_dirs` list (or make it configurable via inspector.config.yml).

### Critical Discovery: FR ID Collision

`Plans/image-upload/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md` **both use FR-070 through FR-076** for entirely different features.

- `// Verifies: FR-070` could mean ImageAttachment type (image-upload) OR OrchestratorCyclesPage (orchestrator-cycle-dashboard)
- Traceability is meaningless for these IDs
- **Fix needed**: Rename orchestrator-cycle-dashboard FRs to FR-090+ or use namespaced IDs (FR-OCD-*)

### Open Implementation Items (dependency-linking plan)

Per Plans/dependency-linking/requirements.md implementation delta (still open as of this audit):
1. **FR-dependency-api-types**: `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`; `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291,293 still use `as any`
2. **FR-dependency-seed**: `portal/Backend/src/database/seed.ts` does not exist
3. **FR-dependency-frontend-tests**: `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` do not exist

### Architecture Violation

`portal/Backend/src/routes/teamDispatches.ts` — direct `db.prepare()` calls in route handlers (3 occurrences). No service layer. Also missing `// Verifies:` comment and has inline `TeamDispatch` interface that should be in portal/Shared/types.ts.

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Enforcer source | tools/traceability-enforcer.py |
| Config | Teams/TheInspector/inspector.config.yml |
| Portal shared types | portal/Shared/types.ts |
| Portal shared API types | portal/Shared/api.ts |
| Portal backend services dir | portal/Backend/src/services/ |
| Portal frontend tests dir | portal/Frontend/tests/ |
| Source backend tests dir | Source/Backend/tests/ |
| Plans with requirements | Plans/*/requirements.md |
| Platform orchestrator | platform/orchestrator/lib/ |

### Pattern: Row Types Are Acceptable Inline

`*Row` interfaces in `portal/Backend/src/services/*.ts` are internal DB row mapping types, not domain entities. They don't need to be in `portal/Shared/` — they never cross the API boundary. Don't flag these as violations.

### Pattern: eslint-disable for react-hooks

Three occurrences of `// eslint-disable-next-line react-hooks/exhaustive-deps` in frontend hooks. All are in hooks where dependency arrays are intentionally limited to prevent infinite re-render loops (fetch-on-mount patterns). Low risk but worth reviewing if stale closures cause bugs.

### Common Pattern Violations to Re-Check Each Run

1. teamDispatches.ts — direct DB in route (STILL OPEN)
2. FR-dependency-api-types — missing blocked_by in UpdateBugInput/UpdateFeatureRequestInput (STILL OPEN)
3. FR-dependency-seed — seed.ts missing (STILL OPEN)
4. FR-dependency-frontend-tests — DependencySection.test.tsx and BlockedBadge.test.tsx missing (STILL OPEN)
5. FR ID collision FR-070 to FR-076 (STRUCTURAL — needs plan re-numbering)
