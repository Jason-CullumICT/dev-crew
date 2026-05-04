# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-04 (Full Audit)

### Critical Discovery: Two Separate Applications, One Enforcer Gap

This repo contains **two distinct applications**:

| Directory | Spec Source | FR Namespace |
|-----------|-------------|--------------|
| `Source/` | `Specifications/workflow-engine.md` (via Plans/self-judging-workflow) | `FR-WF-001..FR-WF-013` |
| `portal/` | `Specifications/dev-workflow-platform.md` (via Plans/dev-workflow-platform etc.) | `FR-001..FR-069` + `FR-dependency-*` + `FR-DUP-*` + `FR-07x..FR-09x` |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, making it **blind to portal/**. The default run picks the most-recently-modified plan (`self-judging-workflow`, FR-WF-*) which lives entirely in `Source/` — so it always PASSES. All 7 portal-based plans report 7–32 "missing" FRs when `--file` is used, even though those implementations exist and are tagged with `Verifies:` in `portal/`.

**Fix needed:** Add `portal` to `source_dirs` in `inspector.config.yml` and in the enforcer's internal scan list (`["Source", "E2E"]` → `["Source", "E2E", "portal"]`).

### Spec Coverage (2026-05-04)

| Spec | FRs | Implemented | Coverage |
|------|-----|-------------|----------|
| `workflow-engine.md` (Source/) | 13 | 13 | 100% |
| `dev-workflow-platform.md` (portal/) | 69 | 69 | 100% |
| `tiered-merge-pipeline.md` | 10 | 0 | 0% (Phase 2) |
| `FR-dependency-*` (portal/) | ~15 | ~15 | ~100% |
| `FR-DUP-*` (portal/) | 13 | 13 | 100% |

### Architecture Violation Hotspot

`portal/Backend/src/routes/teamDispatches.ts` — direct `db.prepare()` calls in route handler, no service layer. This is the **only** architecture violation found.

### Unlinked Implementations (No Verifies Comments)

Production source files with zero FR traceability — present as of first audit:
- `portal/Backend/src/routes/teamDispatches.ts` — also violates service layer rule
- `portal/Frontend/src/components/common/RepoSelector.tsx`
- `portal/Frontend/src/pages/TeamsPage.tsx`

These three features exist with no Plan/Spec coverage found.

### Pattern Violations Found

- 2 `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions (Source/ + portal/)
- 1 empty catch with documented suppression in `DependencyPicker.tsx` (acceptable per docs)
- `console.log` — clean in both Source/ and portal/ backend (logger abstraction used throughout)

### Duplicate Test Files

`Source/Frontend/tests/` has both top-level AND `pages/` subdirectory versions of WorkItemDetailPage.test.tsx and WorkItemListPage.test.tsx — 4 files that are double-covering the same components.

### Useful File Paths for Future Audits

- Portal FR coverage: `grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx"`
- Architecture scan: `grep -rn "db\." portal/Backend/src/routes/` and `Source/Backend/src/routes/`
- Enforcer: `python3 tools/traceability-enforcer.py --file Plans/<plan>/requirements.md` for each plan
- All plans: `find Plans -name "requirements.md"`

---

## Learnings

_(none yet — add cross-run trend observations here)_
