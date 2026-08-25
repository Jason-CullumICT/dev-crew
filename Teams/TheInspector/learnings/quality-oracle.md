# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-08-25 — First full audit (grade: D)

#### Critical discoveries

1. **Spec domain mismatch**: `Specifications/dev-workflow-platform.md` (FR-001–FR-069) describes a *different product* (Feature Requests / Bug Reports / Dev Cycles) than the implementation. The implementation follows `Plans/self-judging-workflow/requirements.md` (FR-WF-001–FR-WF-013) which describes a Work Item routing/assessment engine. Primary-spec coverage = **0%**.

2. **Enforcer scope gap**: `tools/traceability-enforcer.py` auto-selects the most recently modified `Plans/*/requirements.md`. It never scans `Specifications/`. Running the enforcer produces PASSED while 69 primary-spec FRs are untraced. Always run with `--file Specifications/workflow-engine.md` for real coverage.

3. **Unimplemented search route**: `Source/Backend/tests/routes/search.test.ts` explicitly documents that `GET /api/search` is **not wired in app.ts**. These tests intentionally fail. Find this by looking for the comment `NOTE: As of this review cycle`.

4. **Active spec for implementation**: `Specifications/workflow-engine.md` matches the implementation domain. This should be treated as the governing spec, not `dev-workflow-platform.md`.

#### Pattern violations found

- `eslint-disable-next-line react-hooks/exhaustive-deps` at:
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  No explanatory comment. Watch for stale-closure bugs.

- `DebugPortalPage.tsx:1` has `// Verifies: dev-crew debug portal` — not a valid FR ID pattern, enforcer will never match it.

#### Files with no test coverage (recently modified)

- `Source/Frontend/src/pages/DebugPortalPage.tsx`
- `Source/Frontend/src/components/TypeBadge.tsx`
- `Source/Frontend/src/components/StatusBadge.tsx`
- `Source/Frontend/src/components/PriorityBadge.tsx`

#### Useful paths for future audits

| Purpose | Path |
|---------|------|
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Governing domain spec | `Specifications/workflow-engine.md` |
| Superseded/mismatched spec | `Specifications/dev-workflow-platform.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Search route test (intentionally failing) | `Source/Backend/tests/routes/search.test.ts` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |

#### Spec coverage trend

| Date | Primary spec coverage | Plan spec coverage |
|------|----------------------|--------------------|
| 2026-08-25 | 0% (0/69 FRs) | 100% (13/13 FRs) |
