# Verify Reporter Learnings

## 2026-04-14 — FIX-special-chars (Work Item Search 500 on Special Characters)

### Environment notes
- `npx jest` fails in CI because `ts-jest` is not globally installed — always run `npm install` first, then `npm test` (uses local jest).
- `npx vitest` similarly requires local install — use `npm install && npx vitest run`.
- `python3 tools/traceability-enforcer.py` must be run from the **repo root**, not from a subdirectory.

### Fix pattern verified
The search endpoint was fixed by replacing any potential SQL/regex LIKE query with plain JavaScript `String.includes()` in the in-memory store (`workItemStore.ts`). Since the store is in-memory (no SQLite at all), `%`, `_`, and `[` are harmless literals in `.includes()` comparisons.

### Test coverage added by the fix
`tests/routes/search.test.ts` has 4 `FIX-special-chars` tests:
- `%25` (percent) → 200
- `_` (underscore) → 200
- `%5B` (open bracket) → 200
- Literal `50%` in a title is found correctly

### Traceability
`FIX-special-chars` tags in test file are picked up by enforcer as long as they appear in `Source/`. Confirmed passing.

### What to watch
- If the store ever migrates to SQLite or another DB, the LIKE-escape risk returns. The `searchItems` function must re-escape or use parameterised full-text search.
