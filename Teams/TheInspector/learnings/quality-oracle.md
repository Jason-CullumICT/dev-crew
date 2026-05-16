# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-16

### Architecture: Two Separate Applications, Not One

This repo has **two distinct applications**:

| App | Location | Spec | Plan |
|---|---|---|---|
| **Workflow Engine** | `Source/` | `Specifications/workflow-engine.md` | `Plans/self-judging-workflow/` |
| **Dev Workflow Platform** | `portal/` | `Specifications/dev-workflow-platform.md` | `Plans/dev-workflow-platform/` + others |

CLAUDE.md describes module ownership for `Source/Backend/`, `Source/Frontend/`, `portal/` but doesn't emphasize that these are separate, independently-running apps. Confusion between them is the root cause of several findings.

### Traceability Enforcer Scope: CRITICAL GAP

- `tools/traceability-enforcer.py` scans only `["Source", "E2E"]`
- `portal/` is completely outside its scope
- Running enforcer for `dev-workflow-platform` plan gives **false FAILURE** (34 missing) because FR-001…069 live in portal/
- Running enforcer without `--plan` targets `self-judging-workflow` (13 FRs) and gives **PASSED** — but this covers <15% of total requirements
- **Fix needed**: Add `"portal"` to `source_dirs` in enforcer, and add `portal/` to `inspector.config.yml`

### Key File Paths for Fast Future Audits

| What to check | Where to look |
|---|---|
| Enforcer scope | `tools/traceability-enforcer.py:68` — `source_dirs` list |
| Portal traceability | `portal/Backend/` and `portal/Frontend/` — all FR-001+ comments |
| Shared API types | `portal/Shared/api.ts` — UpdateBugInput, UpdateFeatureRequestInput |
| Portal DB seed | `portal/Backend/src/database/` — only `connection.ts` and `schema.ts` as of this audit |
| Portal frontend tests | `portal/Frontend/tests/` — compare to portal component list |
| Direct DB in routes | `portal/Backend/src/routes/*.ts` — grep for `getDb()` |

### Open Requirements (as of 2026-05-16)

Three requirements from `Plans/dependency-linking/requirements.md` remain open:

1. **FR-dependency-api-types** — `blocked_by?: string[]` missing from `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`; `as any` cast in `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293`
2. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist
3. **FR-dependency-frontend-tests** — `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` missing (Source/ copies exist but test the wrong app's components)

### Spec Coverage Trend

- Workflow Engine: 100% (stable)
- Dev Workflow Platform (enforcer-visible): 0% (enforcer blind spot — not a real 0%)
- Dev Workflow Platform (actual, in portal/): ~100% for FR-001…069, ~81% for dependency FRs
- Spec is **~40% stale**: FR-070…095 (image upload), FR-DUP-01…13 (dup/deprecated), FR-dependency-* are implemented but NOT in `Specifications/dev-workflow-platform.md`

### Common Patterns

- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in Source/ frontend files (DependencyPicker, useWorkItems hook)
- Route handlers in `portal/Backend/src/routes/` call `getDb()` then pass db to services — a borderline architecture pattern; raw SQL stays in services but connection acquisition is in the route layer (51 occurrences across 9 route files)
- Large detail components in portal/Frontend (FeatureRequestDetail.tsx at 550 lines, BugDetail.tsx at 546 lines) — consider component extraction
