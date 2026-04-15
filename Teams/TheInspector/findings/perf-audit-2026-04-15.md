## Performance Profiler Findings — 2026-04-15

### Mode: Static (fallback — backend unreachable at http://localhost:3001/)
### Frontend: UP (http://localhost:5173)
### Endpoints Discovered: 14 (from route files)
### Prior Findings: None (first run)

---

### Endpoint Inventory

| Route | File |
|-------|------|
| `POST   /api/work-items` | routes/workItems.ts |
| `GET    /api/work-items` | routes/workItems.ts |
| `GET    /api/work-items/:id` | routes/workItems.ts |
| `PATCH  /api/work-items/:id` | routes/workItems.ts |
| `DELETE /api/work-items/:id` | routes/workItems.ts |
| `POST   /api/work-items/:id/route` | routes/workflow.ts |
| `POST   /api/work-items/:id/assess` | routes/workflow.ts |
| `POST   /api/work-items/:id/approve` | routes/workflow.ts |
| `POST   /api/work-items/:id/reject` | routes/workflow.ts |
| `POST   /api/work-items/:id/dispatch` | routes/workflow.ts |
| `POST   /api/work-items/:id/dependencies` | routes/workflow.ts |
| `GET    /api/work-items/:id/ready` | routes/workflow.ts |
| `GET    /api/dashboard/summary` | routes/dashboard.ts |
| `GET    /api/dashboard/activity` | routes/dashboard.ts |
| `GET    /api/dashboard/queue` | routes/dashboard.ts |
| `POST   /api/intake/zendesk` | routes/intake.ts |
| `POST   /api/intake/automated` | routes/intake.ts |
| `GET    /metrics` | app.ts |
| `GET    /health` | app.ts |

---

### PERF-001: `findAll()` — Multi-pass O(n) scan + O(n log n) sort on every list request

- **Severity:** P2
- **Category:** algorithmic / missing-index
- **File:** `Source/Backend/src/store/workItemStore.ts:30-63`
- **Budget:** p95 < 100ms (config: `/api/work-items`)
- **Detail:**
  Every call to `GET /api/work-items` executes the following sequence:
  1. `Array.from(items.values())` — O(n) Map-to-array conversion
  2. Up to **five sequential `.filter()` passes** (status, type, priority, source, assignedTeam) — each O(n)
  3. `.sort((a, b) => ...)` — O(n log n) in-memory sort involving two `new Date()` parses per comparison
  4. `.slice()` for pagination — O(limit)

  Total: O(5n + n log n) CPU + O(n) memory allocation on **every request**, with no secondary indexes.
  At 1,000 items each with 5 filters active: ~5,000 comparisons + sort. At 10,000 items: ~50,000 comparisons. The date parse inside `.sort()` compounds this — `new Date(b.updatedAt).getTime()` is called twice per comparison element.

- **Recommendation:**
  1. Pre-parse `updatedAt` to a timestamp integer on write (or store it as epoch ms alongside the ISO string) to eliminate `new Date()` in the hot sort path.
  2. Maintain per-status / per-type secondary indexes (`Map<WorkItemStatus, Set<string>>`) updated on create/update/delete. Filter at O(1) index lookup before iterating. Expected improvement: filter passes drop from O(n) to O(result_size).
  3. Consider storing items in insertion order with a sorted secondary structure for the `updatedAt` sort.

---

### PERF-002: `getActivity()` — O(N×M) memory + O(N×M log N×M) sort on every request ⚠️ P1

- **Severity:** P1
- **Category:** algorithmic
- **File:** `Source/Backend/src/services/dashboard.ts:32-54`
- **Budget:** p95 < 150ms (config: `/api/dashboard`)
- **Detail:**
  ```typescript
  const allEntries: (...) [] = [];
  for (const item of items) {          // O(N) items
    for (const entry of item.changeHistory) {  // O(M) entries per item
      allEntries.push({ ...entry, workItemId: item.id, workItemDocId: item.docId });
    }
  }
  allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  ```

  For N work items each with M change history entries:
  - **Memory allocation**: O(N×M) objects spread onto `allEntries` (with object spread `{...entry, ...}` creating new objects)
  - **Sort**: O(N×M × log(N×M)) comparisons, each calling `new Date()` twice
  - **Example at scale**: 500 items × 20 history entries = 10,000 objects sorted on every dashboard activity request
  - **Example at high churn**: 1,000 items × 50 entries (realistic for items that go through full workflow + dependency changes) = 50,000 objects sorted per request

  This is the most expensive operation in the system and will violate the p95 < 150ms budget long before the store reaches production scale.

- **Recommendation:**
  Maintain a **global activity ring buffer** (e.g., `recentActivity: ChangeHistoryEntry[]`, capped at 1,000 entries) updated on every write. Entries are already appended to `item.changeHistory` — simultaneously push to the global ring buffer (with O(1) append + O(1) eviction). The dashboard `/activity` endpoint reads directly from the pre-sorted ring buffer at O(limit) with no sort. Expected improvement: **O(N×M log N×M) → O(1)** per request.
  - **Cross-ref:** Backend-coder (requires store write path change)

---

### PERF-003: `getQueue()` — Returns full WorkItem objects (with unbounded nested arrays) for entire dataset ⚠️ P1

- **Severity:** P1
- **Category:** unbounded / large-payload
- **File:** `Source/Backend/src/services/dashboard.ts:57-76`
- **Budget:** p95 < 150ms (config: `/api/dashboard`)
- **Detail:**
  ```typescript
  const data: QueueGroup[] = Object.values(WorkItemStatus).map((status) => ({
    status,
    count: grouped[status]?.length || 0,
    items: grouped[status] || [],   // <-- FULL WorkItem objects, no limit
  }));
  ```
  Each `WorkItem` includes:
  - `changeHistory: ChangeHistoryEntry[]` — unbounded, grows on every state transition
  - `assessments: AssessmentRecord[]` — 4 per assessment cycle
  - `blockedBy: DependencyLink[]` — unbounded
  - `blocks: DependencyLink[]` — unbounded
  - Full `title`, `description` (potentially long strings)

  For 500 items across 10 status buckets, the serialized response can easily reach 500KB–2MB of JSON. Serialization + network transfer at this size will violate the 150ms p95 budget at any meaningful scale.

  This matches the inspector config's static check: _"Unbounded Map iteration (no slice/limit on work item list)"_ and _"Large payload serialization on GET /api/work-items"_.

- **Recommendation:**
  1. `getQueue()` should return **summary projections** only: `{ id, docId, title, status, priority, assignedTeam, createdAt, hasUnresolvedBlockers }` — not full WorkItem.
  2. Add an optional `limit` per bucket (default 10) with a total item cap.
  3. Clients needing full detail should fetch `GET /api/work-items/:id` individually.
  - **Cross-ref:** Frontend-coder (UI queue display), Backend-coder

---

### PERF-004: `GET /api/work-items` list serializes unbounded nested arrays

- **Severity:** P2
- **Category:** unbounded / large-payload
- **File:** `Source/Backend/src/routes/workItems.ts:60-75`, `Source/Backend/src/store/workItemStore.ts:31-63`
- **Budget:** p95 < 100ms (config: `/api/work-items`)
- **Detail:**
  The paginated list endpoint returns complete `WorkItem` objects including `changeHistory[]`, `assessments[]`, `blockedBy[]`, `blocks[]`. With `limit=20`, if each item has 30 history entries + 4 assessments, the response carries ~680 nested objects. This grows without bound as items accumulate state transitions.

  The spec (CLAUDE.md) distinguishes "List endpoints return `{data: T[]}` wrappers" but does not strip heavy fields — the `findAll()` function returns full objects directly from the in-memory Map.

- **Recommendation:**
  Add a `toListView(item: WorkItem): WorkItemListView` projection function in the store layer that omits `changeHistory`, `assessments`, `blockedBy`, `blocks` (or limits them). Return projections from `GET /api/work-items`; return full objects only from `GET /api/work-items/:id`. Expected payload reduction: ~80–95% per item.
  - **Cross-ref:** api-contract (shared type `WorkItemListView`), Frontend-coder

---

### PERF-005: `setDependencies()` — Serial BFS cycle detection on every dependency

- **Severity:** P2
- **Category:** algorithmic
- **File:** `Source/Backend/src/services/dependency.ts:220-239`
- **Detail:**
  ```typescript
  // Remove all existing (O(d) removals, each O(blockers) store updates)
  for (const link of current) {
    removeDependency(itemId, link.blockerItemId);
  }
  // Add each new one (O(k) additions, each with a full BFS)
  for (const blockerId of blockerIds) {
    const link = addDependency(itemId, blockerId);   // BFS cycle detect per call
  }
  ```
  For a PATCH with `blockedBy: [id1, id2, ..., idK]`:
  - K separate `addDependency()` calls, each running a full BFS from the blocked item
  - BFS traversal cost: O(nodes + edges) in the dependency graph
  - Total: O(K × graph_size) rather than a single O(graph_size) check

  This executes synchronously in the `PATCH /api/work-items/:id` request handler via `setDependencies()`.

- **Recommendation:**
  Refactor `setDependencies()` to: (1) compute the diff (added/removed sets), (2) run a single consolidated cycle check for all new deps in one BFS pass, (3) apply all mutations only after the check passes. Expected improvement: O(K × BFS) → O(BFS) for the cycle-detection portion.

---

### PERF-006: Missing HTTP request latency Histogram (observability gap)

- **Severity:** P2
- **Category:** observability / monitoring gap
- **File:** `Source/Backend/src/metrics.ts`, `Source/Backend/src/app.ts`
- **Detail:**
  The CLAUDE.md architecture rule states: _"Auto-collect route latency via middleware"_. The `metrics.ts` file exposes only domain-event **Counters** (items_created, items_routed, etc.). There is **no** `http_request_duration_seconds` Histogram tracking per-route p50/p95/p99 latency.

  Without a latency histogram:
  - Cannot detect latency budget violations in production (`/api/work-items` p95 < 100ms, `/api/dashboard` p95 < 150ms)
  - Cannot create Prometheus alerts for SLO breaches
  - Cannot verify that performance remains within budget as the store grows

  The `app.ts` request logging middleware (`logger.debug({ msg: 'Incoming request' })`) logs requests but does not record response timing.

- **Recommendation:**
  Add to `metrics.ts`:
  ```typescript
  export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency by route, method, and status',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });
  ```
  Add response-timing middleware in `app.ts` using `res.on('finish', ...)` to record duration. Use `req.route?.path` for the route label to avoid high-cardinality `:id` params.
  - **Cross-ref:** Backend-coder, CLAUDE.md observability rule

---

### PERF-007: `changeHistory` array O(n) spread-copy on every write

- **Severity:** P3
- **Category:** algorithmic
- **Files:**
  - `Source/Backend/src/services/dependency.ts:150-156, 187-194, 279-282`
  - `Source/Backend/src/routes/workflow.ts:117-120, 173-176, 258-265`
- **Detail:**
  Inconsistent pattern: some code uses `item.changeHistory.push(entry)` (O(1)), but many call sites use the spread pattern:
  ```typescript
  changeHistory: [...item.changeHistory, newEntry]        // O(n) copy
  changeHistory: [...dependent.changeHistory, e1, e2]    // O(n) copy, called in cascade loop
  ```
  The spread creates a new array of length n+1 on every state write. In the cascade dispatch loop (`onItemResolved`), this is done twice per auto-dispatched item inside a `for` loop — O(n) spread per iteration.

  For items with 100+ history entries, this generates significant GC pressure on high-throughput workflows.

- **Recommendation:**
  Standardize on **direct mutation via `push()`** throughout the codebase:
  ```typescript
  item.changeHistory.push(statusEntry);
  item.changeHistory.push(teamEntry);
  store.updateWorkItem(id, { status: ..., assignedTeam: ..., changeHistory: item.changeHistory });
  ```
  This is already the pattern used in `workItemStore.ts::softDelete()` and several route handlers. Remove all spread-copy patterns. Expected improvement: eliminates O(n) array allocation on every state transition write.

---

### PERF-008: `computeHasUnresolvedBlockers()` called twice per dispatch check

- **Severity:** P3
- **Category:** algorithmic (minor)
- **File:** `Source/Backend/src/routes/workflow.ts:231-244`, `Source/Backend/src/services/dependency.ts:64-75`
- **Detail:**
  In the dispatch route handler:
  ```typescript
  if (computeHasUnresolvedBlockers(id)) {          // <-- full scan of blockedBy[]
    const readiness = isReady(id);                  // <-- isReady() re-scans blockedBy[]
    ...
    res.status(400).json({ unresolvedBlockers: readiness.unresolvedBlockers });
  }
  ```
  `computeHasUnresolvedBlockers()` scans `item.blockedBy[]` and calls `store.findById()` for each blocker. Then on the error path, `isReady()` does the same scan again to build the `unresolvedBlockers` list for the response.

  Each item with many blockers triggers two O(b) scans where b = number of blockers.

- **Recommendation:**
  Merge into a single call: call `isReady(id)` once and derive the boolean from `!result.ready`:
  ```typescript
  const readiness = isReady(id);
  if (!readiness.ready) {
    dispatchGatingEventsCounter.inc({ event: 'blocked' });
    res.status(400).json({ error: '...', unresolvedBlockers: readiness.unresolvedBlockers });
    return;
  }
  ```
  Eliminates the redundant `computeHasUnresolvedBlockers()` call entirely.

---

## Summary

| ID | Severity | Category | File |
|----|----------|----------|------|
| PERF-001 | P2 | algorithmic / missing-index | store/workItemStore.ts:30 |
| PERF-002 | **P1** | algorithmic | services/dashboard.ts:32 |
| PERF-003 | **P1** | unbounded / large-payload | services/dashboard.ts:57 |
| PERF-004 | P2 | unbounded / large-payload | routes/workItems.ts:60 |
| PERF-005 | P2 | algorithmic | services/dependency.ts:220 |
| PERF-006 | P2 | observability gap | src/metrics.ts + app.ts |
| PERF-007 | P3 | algorithmic | dependency.ts, workflow.ts (multiple) |
| PERF-008 | P3 | algorithmic | routes/workflow.ts:231 |

**P1 count: 2 | P2 count: 4 | P3 count: 2**
**Grade (performance dimension): C** (per config grading: max_p1=2 for C)

---

## Re-Verification Status

No prior P1/P2 findings on record — first run.

---

```json
{
  "audit_date": "2026-04-15",
  "mode": "static",
  "services_up": ["frontend"],
  "services_down": ["backend"],
  "endpoints_discovered": 19,
  "grade_performance_dimension": "C",
  "findings": [
    {
      "id": "PERF-001",
      "severity": "P2",
      "category": "algorithmic",
      "title": "findAll() multi-pass O(n) scan + O(n log n) sort on every list request",
      "file": "Source/Backend/src/store/workItemStore.ts",
      "line": 30,
      "budget_path": "/api/work-items",
      "budget_p95_ms": 100
    },
    {
      "id": "PERF-002",
      "severity": "P1",
      "category": "algorithmic",
      "title": "getActivity() O(N*M) memory + O(N*M log N*M) sort on every dashboard/activity request",
      "file": "Source/Backend/src/services/dashboard.ts",
      "line": 32,
      "budget_path": "/api/dashboard",
      "budget_p95_ms": 150
    },
    {
      "id": "PERF-003",
      "severity": "P1",
      "category": "unbounded",
      "title": "getQueue() returns full WorkItem objects (with changeHistory) for entire dataset — no pagination",
      "file": "Source/Backend/src/services/dashboard.ts",
      "line": 57,
      "budget_path": "/api/dashboard",
      "budget_p95_ms": 150
    },
    {
      "id": "PERF-004",
      "severity": "P2",
      "category": "unbounded",
      "title": "GET /api/work-items list response includes unbounded changeHistory and assessments arrays",
      "file": "Source/Backend/src/routes/workItems.ts",
      "line": 60
    },
    {
      "id": "PERF-005",
      "severity": "P2",
      "category": "algorithmic",
      "title": "setDependencies() runs BFS cycle detection K times (once per new dep) instead of once",
      "file": "Source/Backend/src/services/dependency.ts",
      "line": 220
    },
    {
      "id": "PERF-006",
      "severity": "P2",
      "category": "observability",
      "title": "Missing http_request_duration_seconds Histogram — cannot detect latency budget violations",
      "file": "Source/Backend/src/metrics.ts"
    },
    {
      "id": "PERF-007",
      "severity": "P3",
      "category": "algorithmic",
      "title": "changeHistory array O(n) spread-copy on every write — inconsistent with push() pattern",
      "files": [
        "Source/Backend/src/services/dependency.ts",
        "Source/Backend/src/routes/workflow.ts"
      ]
    },
    {
      "id": "PERF-008",
      "severity": "P3",
      "category": "algorithmic",
      "title": "computeHasUnresolvedBlockers() called redundantly before isReady() in dispatch handler",
      "file": "Source/Backend/src/routes/workflow.ts",
      "line": 231
    }
  ],
  "p1_count": 2,
  "p2_count": 4,
  "p3_count": 2,
  "escalations": []
}
```
