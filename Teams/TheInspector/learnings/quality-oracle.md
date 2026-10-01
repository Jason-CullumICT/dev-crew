# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-10-01 — First Full Audit

**Traceability architecture: two separate systems coexist in Specifications/**
- `Specifications/dev-workflow-platform.md` (FR-001 → FR-069 + FR-dependency-*) is the OLDER spec for a previous feature-request portal system. Its Plans live at `Plans/dev-workflow-platform/`.
- `Specifications/workflow-engine.md` is the CURRENT spec for the Self-Judging Workflow Engine (no numbered FRs in the spec itself — uses Plans/self-judging-workflow/requirements.md for FR-WF-001 to FR-WF-013).
- `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 → FR-TMP-010) is an aspirational spec with ZERO implementation in Source/.
- The enforcer (`tools/traceability-enforcer.py`) only scans the most-recently-modified `requirements.md` in Plans/ — it is BLIND to all Specifications/ files. Critical gap.

**Enforcer scoping:**
- Run: `python3 tools/traceability-enforcer.py` → targets `Plans/self-judging-workflow/requirements.md`
- To target tiered-merge-pipeline: `python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md`
- 13/13 FR-WF-* have Verifies comments → PASSED
- 0/10 FR-TMP-* have any implementation → FAILED (enforcer does not know this)

**Source/Backend architecture pattern:**
- Route handlers (`routes/workItems.ts`, `routes/workflow.ts`) call `store.*` directly — no service-layer abstraction for basic CRUD. This violates the architecture rule but is consistent throughout the codebase. Both files have 6-10 direct store calls.
- Services exist for domain logic (assessment, router, dependency, dashboard, changeHistory) but NOT for basic work-item CRUD.

**Test organization:**
- Duplicate test files exist for `WorkItemDetailPage` and `WorkItemListPage`: one set in `tests/` (root) and one in `tests/pages/`. The pages/ set appears to be the newer canonical location. The root versions seem to be kept from initial scaffolding.
- Frontend test coverage is generally good; all major pages/components have test files.

**E2E tests:**
- `Source/E2E/` has ONLY Playwright config files. Zero actual test specs. `package.json` test script is a stub (`echo "Error: no test specified" && exit 1`). E2E harness is wired but unused.

**Silent catch (intentional):**
- `Source/Frontend/src/api/client.ts:26` — `.catch(() => ({}))` is intentionally defensive (fallback when HTTP error body is not JSON). Document why in code; currently undocumented.

**eslint-disable patterns (benign but undocumented):**
- `Source/Frontend/src/hooks/useWorkItems.ts:63` — exhaustive-deps suppression for stable filter keys in useEffect
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — exhaustive-deps suppression for useCallback with stable set deps
- Both are arguably correct React patterns but lack inline rationale comments.

**Fast file lookups for future audits:**
- Spec FRs: `grep -oP "FR-[A-Z0-9-]+" Specifications/*.md | sort -u`
- Source Verifies: `grep -rn "Verifies:" Source/ | grep -v node_modules`
- Store calls in routes: `grep -n "store\." Source/Backend/src/routes/*.ts`
- Console.log: `grep -rn "console\." Source/Backend/src/ Source/Frontend/src/` (should be 0 in production)
