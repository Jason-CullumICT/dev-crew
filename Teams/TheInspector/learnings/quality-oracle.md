# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-08-23 — First audit run

**Spec coverage trend:** 29% overall — baseline established. Needs improvement.

**Critical context: Dual-spec problem**
- `Specifications/dev-workflow-platform.md` defines FR-001 → FR-069+ for a SQLite/Feature-Requests/DevCycles system that has **zero implementation** in `Source/`.
- The actual implementation follows `Plans/self-judging-workflow/requirements.md` (FR-WF-001 → FR-WF-013) — an in-memory Work Item workflow system.
- These are DIFFERENT systems. Do not conflate them. Future audit: check if Specifications/ has been archived, retracted, or clarified with a status banner.

**Traceability enforcer scope**
- `tools/traceability-enforcer.py` hardcodes its scan to `Plans/self-judging-workflow/requirements.md`.
- 13 requirements only. Reports PASSED unconditionally unless those 13 are broken.
- `Plans/dependency-linking/requirements.md` (16 FR-dependency-*) is also NOT scanned.
- Do NOT trust the enforcer PASSED result as global coverage — it is a 13-requirement gate only.

**Useful file paths**
- All FR-WF-* requirements: `Plans/self-judging-workflow/requirements.md`
- All FR-dependency-* requirements: `Plans/dependency-linking/requirements.md`
- Unimplemented spec: `Specifications/dev-workflow-platform.md` (FR-001–FR-069, FR-dependency-*)
- Enforcer script: `tools/traceability-enforcer.py`
- Backend source: `Source/Backend/src/` (routes/, services/, store/, models/, middleware/, utils/)
- Backend tests: `Source/Backend/tests/routes/`, `tests/services/`, `tests/store/`
- Frontend source: `Source/Frontend/src/` (pages/, components/, hooks/, api/)
- Frontend tests: `Source/Frontend/tests/`

**Open gaps to re-verify next run**
- QO-001 (P1): Enforcer scope gap — still open as of 2026-08-23
- QO-002 (P1): Specifications/ vs implementation mismatch — still open
- QO-003 (P2): `GET /api/search` not wired in `app.ts` — `Source/Backend/tests/routes/search.test.ts` documents the gap explicitly
- QO-004 (P2): FR-dependency-* not in enforcer — still open
- QO-005 (P3): `Source/Frontend/src/api/client.ts:26` — `.catch(() => ({}))` silent parse suppression
- QO-006 (P3): eslint-disable in `useWorkItems.ts:63` and `DependencyPicker.tsx:82`
- QO-007 (P3): `DebugPortalPage.tsx` uses informal Verifies ID (not FR-*)
- QO-008 (P3): `Source/Backend/src/routes/workflow.ts:330` string-matching error classification in catch

**Pattern checks that PASSED (no issues)**
- No `console.log` in production source — logger abstraction enforced everywhere
- No skipped/todo tests — full test suite active
- No hardcoded secrets — env vars used
- Catch blocks all log or explicitly document suppression reason (except QO-005)
- List endpoints use `{data: T[]}` wrappers
- Business logic free of framework imports

**Common FR ID formats to grep for**
- `FR-WF-\d+` — self-judging-workflow requirements
- `FR-dependency-[a-z-]+` — dependency-linking requirements
- `FR-\d{3}` — Specifications/ requirements (not implemented; search for absence)
