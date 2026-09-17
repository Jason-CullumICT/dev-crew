# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-09-17

### Architecture

- **Two distinct codebases coexist:**
  - `Source/` — standalone "self-judging workflow" app. Uses FR-WF-001 to FR-WF-013 IDs (Plans/self-judging-workflow). In-memory store; no DB.
  - `portal/` — full dev management platform (portal/Backend + portal/Frontend). Uses FR-001 through FR-095, FR-DUP-*, FR-dependency-* IDs. SQLite via connection.ts + schema.ts.
  - These are separate apps, separate port ranges, separate test suites.

- **Main spec scope:** `Specifications/dev-workflow-platform.md` covers FR-001 to FR-069 and maps to the **portal/** system, not Source/. Source/ is the sample app built by the pipeline.

### Traceability Enforcer Behavior

- `tools/traceability-enforcer.py` uses `max(req_files, key=os.path.getmtime)` to select a single plan — it always targets the most-recently-modified `requirements.md`.
- As of 2026-09-17, it targets `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* IDs).
- 7 other plans with requirements.md are silently unenforced. This is the single largest structural quality gap in the project.
- **Audit shortcut:** Always check `ls -t Plans/*/requirements.md | head -1` to see what the enforcer will actually check.

### Open Delta Items (dependency-linking plan)

These were documented as ❌ Missing in `Plans/dependency-linking/requirements.md` and **remain unimplemented as of 2026-09-17:**

1. **FR-dependency-api-types** → `portal/Shared/api.ts`: `UpdateBugInput` and `UpdateFeatureRequestInput` both lack `blocked_by?: string[]`.
2. **FR-dependency-seed** → `portal/Backend/src/database/seed.ts` does not exist.
3. **FR-dependency-frontend-tests** → `portal/Frontend/tests/` is missing `DependencySection.test.tsx` and `BlockedBadge.test.tsx`.

### Spec Coverage Trend

- First run — no prior trend. Baseline: 100% manual coverage of FR-001/FR-069; 19% enforcer coverage.

### Common Pattern Violations

- Logger dev/prod split: `Source/Backend/src/utils/logger.ts` always outputs JSON (no NODE_ENV branch). Both FR-003 and FR-WF-013 require pretty-printing in development.
- Error discrimination by string matching: `Source/Backend/src/routes/workflow.ts` catch block at ~line 330 parses error type from `.message` text. Recommend typed error subclasses.
- Dual logger API: `Source/Backend/src/store/workItemStore.ts` uses named import from `utils/logger`; all other files use default import from `logger`. Two incompatible calling conventions.
- eslint-disable without justification: `useWorkItems.ts:63` and `DependencyPicker.tsx:82`.

### Useful File Paths for Future Audits

| What to check | Where |
|---|---|
| FR traceability in Source/ | `grep -rn "Verifies:" Source/Backend/src/ Source/Frontend/src/` |
| FR traceability in portal/ | `grep -rn "Verifies:" portal/Backend/src/ portal/Frontend/src/` |
| Enforcer target | `ls -t Plans/*/requirements.md \| head -1` |
| Open plan deltas | `Plans/dependency-linking/requirements.md` (delta table at bottom) |
| Backend test files | `Source/Backend/tests/` (14 files) |
| Portal frontend test files | `portal/Frontend/tests/` (17 files) |
| Main spec FR IDs | `Specifications/dev-workflow-platform.md` lines 337–459 |
| Logger implementation | `Source/Backend/src/utils/logger.ts`, `Source/Backend/src/logger.ts` |

### FR ID Namespaces in Use

| Namespace | Plans | Codebase |
|---|---|---|
| `FR-001` to `FR-069` | Main spec + Plans/dev-workflow-platform | `portal/` |
| `FR-070` to `FR-095` | Expansion beyond main spec | `portal/` |
| `FR-WF-001` to `FR-WF-013` | Plans/self-judging-workflow | `Source/` |
| `FR-dependency-*` | Plans/dependency-linking | `portal/` and `Source/` (parallel impl) |
| `FR-DUP-*` | Plans/duplicate-deprecated-status | `portal/` |
| `FR-0001` | (typo variant seen in portal/Frontend/src) | `portal/` |
