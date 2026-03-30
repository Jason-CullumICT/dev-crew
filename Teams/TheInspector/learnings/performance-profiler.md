# Performance Profiler Learnings

## Run: run-20260330-071418
**Date:** 2026-03-30
**Feature audited:** duplicate/deprecated status for bugs and feature requests

### Stack Notes
- SQLite via better-sqlite3 (synchronous API — no async query overhead)
- Express.js routes delegate to service layer
- No ORM — raw SQL prepared statements

### Known Performance Issues (Open)

#### N+1 on list endpoints (P1)
Every call to `listBugs()` and `listFeatureRequests()` calls `mapBugRow()`/`mapFRRow()` for each result row, and each of those fires:
- 1 query for `duplicated_by` (SELECT id FROM bugs/feature_requests WHERE duplicate_of = ?)
- 2 queries via DependencyService (`getBlockedBy` + `getBlocks`)
- 1 computed check (`hasUnresolvedBlockers`, which calls `getBlockedBy` again — double-counted)

Net: **4 extra queries per item** on every list request. A list of 100 bugs = ~401 SQL statements.

Files: `portal/Backend/src/services/bugService.ts:38-66`, `portal/Backend/src/services/featureRequestService.ts:109-139`

#### Missing indexes on status and duplicate_of columns (P1)
The `status` column is used in WHERE filters on every list query and in GROUP BY for the dashboard. The `duplicate_of` column is used in a sub-query fired per row for `duplicated_by` computation. Neither column has a DB index. The `duplicate_of` sub-query is particularly costly at scale because it fires N times per list call with a full table scan.

Files: `portal/Backend/src/database/schema.ts` — no `idx_feature_requests_status`, `idx_bugs_status`, `idx_feature_requests_duplicate_of`, `idx_bugs_duplicate_of`

#### Unbounded list queries — no pagination (P2)
`listBugs` and `listFeatureRequests` have no LIMIT/OFFSET. `include_hidden=true` enlarges the result set further. `getDashboardActivity` loads all rows from 6 tables into memory before slicing in JavaScript.

#### Jaccard duplicate scan on every FR create (P2)
`createFeatureRequest` loads ALL existing FR titles (`SELECT id, title FROM feature_requests`) for in-memory similarity scoring. O(n) growth: 10 k FRs = 10 k rows fetched on every POST.

### Useful Commands for This Stack
```bash
# Check EXPLAIN QUERY PLAN for a statement
sqlite3 /path/to/db.sqlite "EXPLAIN QUERY PLAN SELECT * FROM bugs WHERE status = 'reported'"

# Index list
sqlite3 /path/to/db.sqlite ".indexes"
```
