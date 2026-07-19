# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-19 — Full Audit

### Project Architecture (Critical Context)

This repo has **two distinct apps** and an orchestrator:

| Directory | App | Plans/Specs | Traceability IDs |
|-----------|-----|-------------|------------------|
| `Source/` | Self-Judging Workflow Engine | `Plans/self-judging-workflow/`, `Plans/dependency-linking/` | `FR-WF-*`, `FR-dependency-*` |
| `portal/` | Dev-Workflow Platform | `Plans/dev-workflow-platform/`, `Plans/orchestrated-dev-cycles/`, `Plans/dev-cycle-traceability/`, `Plans/image-upload/`, `Plans/duplicate-deprecated-status/`, `Plans/orchestrator-cycle-dashboard/`, `Plans/dependency-linking/` | `FR-001..FR-090+`, `FR-dependency-*` |
| `platform/` | Orchestrator Infrastructure | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-*` |

**The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`.**
This means portal/ and platform/ are invisible to the enforcer. The enforcer's default invocation always picks the most-recently-modified plan — on 2026-07-19 that is `Plans/self-judging-workflow/requirements.md`, which PASSES. Running `python3 tools/traceability-enforcer.py` with no args gives a **false green**.

### Useful Paths for Future Audits

- Enforcer: `tools/traceability-enforcer.py` — run with `--file Plans/<name>/requirements.md` per plan
- Source/ backend routes: `Source/Backend/src/routes/` (4 files; no search.ts)
- Portal backend routes: `portal/Backend/src/routes/` (8 files including search.ts)
- Portal frontend tests: `portal/Frontend/tests/` (15 test files)
- Source frontend tests: `Source/Frontend/tests/` (8 files + subdirs pages/ and components/)
- Duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` both run

### Traceability Coverage Trend

| Scope | Plan | FRs | Covered in Source | Grade |
|-------|------|-----|-------------------|-------|
| Source/ | self-judging-workflow | 13 | 13 (100%) | ✅ PASS |
| Source/ | dependency-linking | 7* | 0 (0%) | ❌ FAIL* |
| portal/ | dev-workflow-platform | 34 | not scanned | ❓ |
| portal/ | orchestrated-dev-cycles | 18 | not scanned | ❓ |
| portal/ | dev-cycle-traceability | 21 | not scanned | ❓ |
| portal/ | image-upload | 21 | not scanned | ❓ |
| portal/ | duplicate-deprecated-status | 15 | not scanned | ❓ |
| portal/ | orchestrator-cycle-dashboard | 8 | not scanned | ❓ |
| platform/ | tiered-merge-pipeline | 10 | not scanned | ❓ |

*dependency-linking shows 7 missing in Source/ due to regex false positives (FR-0002..FR-0007, FR-070, FR-085 extracted from example seed data and spec reference prose in the .md file — not real requirements).

portal/ has 937+ `Verifies:` comments covering the numeric FR IDs. The enforcer just doesn't scan portal/.

### Open Implementation Gaps (confirmed 2026-07-19)

1. **FR-dependency-search** — route NOT registered in `Source/Backend/src/app.ts`; test file `tests/routes/search.test.ts` documents this as intentional gap (tests will fail until implemented)
2. **FR-dependency-api-types** — `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` still lack `blocked_by?: string[]`; `DependencyPicker.tsx:291/293` uses `as any` cast
3. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist
4. **FR-dependency-frontend-tests** — `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` do not exist

### Architecture Violations (confirmed)

- **OTel tracing**: Zero `@opentelemetry` imports in `Source/Backend`. CLAUDE.md mandates OTel for HTTP, DB, and critical paths. Not in `package.json` either. FR-WF-013 is only partially satisfied (logging + metrics present; tracing absent).

### Common Pattern Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in:
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  Both are intentional suppressions (manual dep arrays to control fetch triggers), but should be reviewed periodically.

### Regex False Positive Warning

`tools/traceability-enforcer.py` uses `re.compile(r"FR-[A-Z0-9-]+")` to extract requirement IDs from plan files.
This matches:
- Example entity IDs in prose: `FR-0004 blocked_by FR-0003` in seed data descriptions
- Spec reference ranges: `(FR-070 — FR-085)` in header lines

Always verify "missing" IDs against the actual requirements table before reporting them as gaps.
