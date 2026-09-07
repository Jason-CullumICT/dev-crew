# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-09-07 — First Full Audit (Source/ scope, self-judging-workflow + dependency-linking)

#### Architecture Facts

- **`Source/` implements workflow-engine.md** (FR-WF-001–013), NOT dev-workflow-platform.md. The dev-workflow-platform spec is for `portal/`, a separate app. Don't cross-compare them.
- **Two spec families active in Source/:**
  1. `Plans/self-judging-workflow/requirements.md` — FR-WF-001–013, all implemented, enforcer passes
  2. FR-dependency-* requirements (dependency linking, adapted from `Plans/dependency-linking/`) — mostly implemented, 2 gaps
- **`platform/`** implements FR-TMP-001–010 (tiered-merge-pipeline spec); do not look for these in Source/.

#### Traceability Enforcer Behavior

- Enforcer auto-selects "most recently modified" plan by **directory mtime**. When all plans share the same mtime (common after bulk checkout), it selects `self-judging-workflow` deterministically (appears to be alphabetically last among equals).
- FR-dependency-* requirements are **not listed** in the self-judging-workflow plan, so they are never checked by the default gate. This is a coverage blind spot.
- To check FR-dependency-*: run `python3 tools/traceability-enforcer.py --plan dependency-linking` — but note it scans Source/ for portal/ requirements (FR-0002 etc.) which will always fail. Not useful as-is.
- **Fix needed**: Add FR-dependency-* IDs to the self-judging-workflow plan requirements table.

#### Known Open Gaps (as of 2026-09-07)

| ID | Severity | Finding |
|----|----------|---------|
| QO-001 | P1 | `GET /api/search` not registered in `app.ts` — `tests/routes/search.test.ts` will fail |
| QO-002 | P2 | `dependencyCheckDuration` Histogram absent from `metrics.ts` (other 3 metrics present) |
| QO-003 | P2 | Traceability enforcer blind to FR-dependency-* (coverage gap in gate) |
| QO-004 | P3 | No OTel tracing implemented — architecture rule in CLAUDE.md violated |
| QO-005 | P3 | Duplicate test files: `tests/WorkItemDetailPage.test.tsx` + `tests/pages/WorkItemDetailPage.test.tsx`; same for WorkItemListPage |
| QO-006 | P3 | `Source/E2E/package.json` test script exits 1 with no tests — breaks `npm test --workspaces` gate |
| QO-007 | P4 | `eslint-disable react-hooks/exhaustive-deps` at DependencyPicker.tsx:82 and useWorkItems.ts:63 without rationale comments |

#### Useful Fast-Audit Paths

- Traceability check: `python3 tools/traceability-enforcer.py` (checks FR-WF-*)
- Search for Verifies comments: `grep -rn "Verifies:" Source/`
- Console.log check: `grep -rn "console\." Source/Backend/src/` (currently clean — all use structured logger)
- Architecture violations fast scan: `grep -rn "eslint-disable\|@ts-ignore" Source/`
- Catch block hygiene: `grep -A3 "catch (err" Source/Backend/src/routes/` (currently all log + respond correctly)
- Find unregistered routes: compare `app.use('/api/...'` entries in `app.ts` vs test files in `tests/routes/`

#### Coverage Trend

- First audit: 93% (13/13 FR-WF + 14/16 FR-dependency)
- Next target: 100% after QO-001 (search route) and QO-002 (histogram) are fixed
