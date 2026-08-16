# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-16 — Full Audit

### Spec Landscape (Critical to Understand)

This project has **three distinct spec layers**; confusing them leads to false positives:

| Spec File | Target Layer | FR IDs | Status |
|-----------|-------------|--------|--------|
| `Specifications/workflow-engine.md` | `Source/` app — Self-Judging Workflow Engine | FR-WF-001…013 | **ACTIVE** — fully implemented |
| `Plans/dependency-linking/requirements.md` | `Source/` app — Dependency Linking feature | FR-dependency-* | **ACTIVE** — 14/15 implemented; FR-dependency-search intentionally unimplemented |
| `Specifications/dev-workflow-platform.md` | A DIFFERENT product (Feature Requests, Bug Reports, Dev Cycles) | FR-001…069 | **STALE/SUPERSEDED** — 0% implementation in Source/; appears to be from a prior product iteration |
| `Specifications/tiered-merge-pipeline.md` | `platform/` orchestrator (not Source/) | FR-TMP-001…010 | **OUT OF SCOPE** for Source/ — belongs to platform layer |

**Key insight:** The traceability enforcer (`tools/traceability-enforcer.py`) auto-selects the most-recently-modified requirements.md in Plans/, which is `Plans/self-judging-workflow/requirements.md` (FR-WF-*). This is correct for the current implementation. Running it against `Specifications/dev-workflow-platform.md` will show 100% failure — but that spec is for a different product.

### Inspector Config Misconfiguration

`Teams/TheInspector/inspector.config.yml` has:
```yaml
specs:
  dir: "Specifications/"
  patterns:
    traceability: "FR-\\d+"   # ← WRONG: matches FR-001 format, not FR-WF-001 or FR-dependency-*
```

The actual traceability IDs in the codebase are:
- `FR-WF-\d+` (e.g., FR-WF-001, FR-WF-013)
- `FR-dependency-\w+` (e.g., FR-dependency-service, FR-dependency-search)

The pattern `FR-\\d+` will never match any Verifies comment. This config needs updating.

### Architecture Rule Status

| Rule | Status |
|------|--------|
| No `console.log` in production | ✅ Clean — logger abstraction used everywhere |
| Shared types as single source of truth | ✅ `Source/Shared/types/workflow.ts` imported by both layers |
| Every FR needs a test with Verifies comment | ✅ All FR-WF-* and FR-dependency-* have Verifies comments |
| No hardcoded secrets | ✅ Clean (localhost URLs in config files only) |
| All list endpoints return `{data: T[]}` | ✅ Consistent |
| No direct DB calls from route handlers | ⚠️ VIOLATION: workItems.ts, intake.ts, workflow.ts all call `store.*` directly |
| Never swallow errors silently | ⚠️ api/client.ts:26 `.catch(() => ({}))` swallows JSON parse errors |
| Structured logging (no console.log) | ✅ logger abstraction used; two logger files exist (compat wrapper) |

### Useful File Paths

- Main shared types: `Source/Shared/types/workflow.ts`
- Store (data layer): `Source/Backend/src/store/workItemStore.ts`
- Logger shim: `Source/Backend/src/logger.ts` (wraps `src/utils/logger.ts`)
- Actual logger: `Source/Backend/src/utils/logger.ts`
- Traceability enforcer: `tools/traceability-enforcer.py` (checks Plans/ most-recent requirements.md)
- All backend route tests present, all backend service tests present
- Frontend test duplication: WorkItemDetailPage and WorkItemListPage have both top-level AND pages/ subdirectory tests with different coverage

### Open Implementation Gaps

1. **FR-dependency-search** (`GET /api/search`): Tests exist in `Source/Backend/tests/routes/search.test.ts` but endpoint not wired in `app.ts`. Tests are self-documented as intentionally failing.
2. **FR-TMP-001…010** (Tiered Merge Pipeline): 0% in Source/ — but these belong to `platform/` orchestrator, not the Source/ app.
3. **FR-001…069** (dev-workflow-platform): 0% in Source/ — but this is a superseded spec for a different product.

### Test Infrastructure Warning

`node_modules` are NOT installed in `Source/Backend/` or `Source/Frontend/`. Running `npm test` fails with "jest not found". The verification gates cannot be executed without `npm install` first.

### Spec Coverage Trend

- **Effective coverage** (active specs only): 27/28 requirements = **96%** (FR-dependency-search intentionally deferred)
- **Nominal coverage** (all Specifications/ + active Plans/): inflated by stale dev-workflow-platform.md

---

## Pattern Library (for faster future audits)

```bash
# Check for direct store imports in routes (architecture violation check)
grep -rn "import.*store\|from.*store" Source/Backend/src/routes/

# Check for Verifies comments by pattern family
grep -rn "Verifies:.*FR-WF" Source/ --include="*.ts"
grep -rn "Verifies:.*FR-dependency" Source/ --include="*.ts"

# Find files without any Verifies comment (recently modified = P2, older = P3)
find Source/ -name "*.ts" -o -name "*.tsx" | xargs grep -L "Verifies:" | grep -v "node_modules\|dist\|vite\|setup"

# Run traceability enforcer against current plan
python3 tools/traceability-enforcer.py

# Check search route wiring
grep -n "search" Source/Backend/src/app.ts
```
