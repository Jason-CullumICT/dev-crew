# Chaos Monkey Learnings

## Run: run-20260330-071418
**Feature Audited:** duplicate/deprecated status for bugs and feature requests
**Mode:** Static (all services down)
**Date:** 2026-03-30

### Key Findings

1. **Bugs lack a STATUS_TRANSITIONS guard** — featureRequestService.ts enforces explicit allowed-transitions via `STATUS_TRANSITIONS` table; bugService.ts has no equivalent. Only the terminal-status guard (`duplicate`/`deprecated` cannot transition out) exists. Any non-terminal bug status can transition to any other non-terminal bug status (e.g., `resolved` → `reported`).

2. **Chain-of-duplicates is not blocked** — the `duplicate_of` validation checks that the referenced item exists, but does NOT check whether that item is itself a duplicate. This allows an item to point to another duplicate, creating a chain with no guarantee of reaching a canonical item.

3. **`include_hidden=true` + `status=duplicate` filter bypass** — when both params are provided simultaneously, the HIDDEN_STATUSES exclusion is correctly skipped, but the status filter is additive. This is correct behavior but has an edge: if `include_hidden` is false and `status=duplicate` is passed, the WHERE clause produces `status NOT IN ('duplicate','deprecated') AND status = 'duplicate'` — which returns zero rows silently. Not a crash, but a confusing silent empty result for any caller that tries to filter by hidden status without opting into `include_hidden=true`.

4. **Race conditions on concurrent duplicate marking** — SQLite's default WAL mode provides read isolation but concurrent PATCH requests can both read the item as non-terminal, both validate `duplicate_of`, and both attempt to write. Last write wins. No optimistic locking or transaction wrapping the read-validate-write sequence.

5. **Frontend-only validation for duplicate ID format** — `BugDetail.tsx` checks that the ID starts with `BUG-` before calling the API. If the UI check is bypassed (raw API call), the backend catches the non-existent ID via the DB lookup. This is correct defense-in-depth, but the frontend would accept `BUG-0000` which may not exist.

6. **`deprecation_reason` silently dropped on PATCH without `status`** — if a caller sends only `deprecation_reason` without `status`, the service will not persist it because `deprecation_reason` is only written inside the `if (input.status !== undefined)` branch.

### Robust Patterns Observed
- Self-reference checks on `duplicate_of` (both frontend and backend layers)
- Non-existent `duplicate_of` reference validation (400 with clear message) — FRs only; bugs have the same guard
- Terminal status guard blocks transitions out of `duplicate`/`deprecated`
- `HIDDEN_STATUSES` exclusion correctly defaults to hiding items
- `duplicated_by` computed field correctly reflects reverse references

### Error Handling Patterns
- All routes use `try/catch + next(err)` consistently — no catch-and-swallow
- `AppError` used uniformly for domain errors with correct HTTP codes
- `DependencyError` has its own catch block in route handlers

### MCP Tools Available
- Standard Bash, Read, Grep, Edit tools only — no HTTP injection tools available in static mode
