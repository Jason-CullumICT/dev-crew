---

## Performance Profiler Findings — 2026-04-15

### Mode: **Static** (backend unreachable at `localhost:3001`; frontend UP)
### Endpoints Discovered: 19 (from route files)
### Prior Findings Re-verified: N/A (first run)

---

### Finding Summary

| ID | Severity | Category | Location | Issue |
|----|----------|----------|----------|-------|
| **PERF-002** | **P1** | algorithmic | `services/dashboard.ts:32` | `getActivity()` — O(N×M) memory + O(N×M log N×M) sort on every request |
| **PERF-003** | **P1** | unbounded | `services/dashboard.ts:57` | `getQueue()` — returns full `WorkItem` objects (with `changeHistory[]`) for entire dataset |
| PERF-001 | P2 | algorithmic | `store/workItemStore.ts:30` | `findAll()` — 5 sequential O(n) filter passes + O(n log n) sort with `Date` parsing, no indexes |
| PERF-004 | P2 | unbounded | `routes/workItems.ts:60` | List endpoint serializes full `changeHistory[]` + `assessments[]` on every paginated response |
| PERF-005 | P2 | algorithmic | `services/dependency.ts:220` | `setDependencies()` runs BFS cycle detection K times (once per dep) instead of once |
| PERF-006 | P2 | observability | `src/metrics.ts` / `app.ts` | No `http_request_duration_seconds` Histogram — violates CLAUDE.md "auto-collect route latency" rule |
| PERF-007 | P3 | algorithmic | `dependency.ts`, `workflow.ts` | `changeHistory` O(n) array spread-copy on every write — inconsistent with `push()` pattern |
| PERF-008 | P3 | algorithmic | `routes/workflow.ts:231` | `computeHasUnresolvedBlockers()` called redundantly then `isReady()` repeats same scan |

**P1: 2 | P2: 4 | P3: 2 → Performance dimension grade: C**

---

### Top 3 Critical Recommendations

**1. PERF-002 (P1) — Activity ring buffer**: Replace the full cross-product flatten+sort in `getActivity()` with a global pre-sorted ring buffer (cap ~1,000). Push to it on every changeHistory write. Request handler reads O(limit) with no sort.

**2. PERF-003 (P1) — Queue payload projection**: `getQueue()` must return summary projections (`id`, `docId`, `title`, `status`, `priority`, `assignedTeam`) — not full `WorkItem` objects. Add a per-bucket `limit` (default 10). At 500 items this drops the response from ~1MB to ~15KB.

**3. PERF-006 (P2) — Latency histogram**: Add `http_request_duration_seconds` Histogram to `metrics.ts` and wire a `res.on('finish')` middleware in `app.ts`. This is architecturally required by CLAUDE.md and is the only way to detect budget violations (`/api/work-items` p95 < 100ms, `/api/dashboard` p95 < 150ms) in production.

Full report: `Teams/TheInspector/findings/perf-audit-2026-04-15.md`
Learnings updated: `Teams/TheInspector/learnings/performance-profiler.md`
