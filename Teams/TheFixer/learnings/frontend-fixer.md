# Frontend Fixer Learnings

## 2026-04-14 — Special Character Search Bug (FIX-search-special-chars)

### Bug: Work item search 500 on special regex characters

**Root cause**: Backend `/api/search` endpoint was not implemented (pure backend gap).

**Frontend status**: Already correct. `workItemsApi.searchItems(q)` in `src/api/client.ts`
uses `URLSearchParams` which automatically percent-encodes `%` → `%25`, `[` → `%5B`,
and passes `_` safely. No frontend code changes needed.

**Fix applied**: Added 4 missing tests in `tests/api-client.test.ts` tagged
`// Fixes: FIX-search-special-chars` that verify URL-encoding of `%`, `[`, `_`, and
combinations thereof. These tests pass against the existing implementation.

### Fix-plan scope tag: `backend-only`

When the fix plan says `backend-only`, still do a wiring audit and add any missing
coverage tests for the frontend surface area described in the bug. Zero source changes
does not mean zero test additions — if the bug touches a codepath, add a test proving
the frontend side is correct.

### Wiring audit pattern

After every fix, confirm:
1. `src/pages/*.tsx` — every file listed matches a `<Route>` in `App.tsx`
2. `App.tsx` routes all map to real page components (no dead routes)
3. Any component that calls an API method has that method covered in `tests/api-client.test.ts`

### URL encoding

`URLSearchParams` in the browser natively percent-encodes all RFC-3986 reserved chars.
Test assertions should use `toContain('%25')` (not `toContain('%')`) when checking that
`%` was encoded, because the assertion string itself is a plain JS string — `%25` is the
literal characters `%`, `2`, `5`.

### Test IDs convention

All tests must include `// Verifies: FR-XXX` or `// Fixes: FIX-XXX`.
For frontend tests that prove a backend-originated bug does not affect the frontend:
use `// Fixes: FIX-<bug-slug>`.

### No-op runs

When the fix plan marks the frontend as a skip, do not skip entirely:
1. Establish the test baseline (run `npm test`)
2. Read the relevant source files to confirm the assessment
3. Add any missing coverage tests for the affected codepath
4. Re-run tests and confirm green
5. Write learnings
