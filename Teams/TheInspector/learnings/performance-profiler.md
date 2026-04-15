# Performance Profiler Learnings

_Persistent learnings for the performance profiler agent. Updated after each audit run._

---

## Stack Profile

- **Runtime**: Node.js + TypeScript, Express REST API
- **Storage**: In-memory `Map<string, WorkItem>` — no database, no persistence
- **Frontend**: React SPA (Vite, port 5173)
- **Metrics**: prom-client, exposed at `GET /metrics`
- **Logging**: Structured JSON (pino-based logger)
- **No authentication layer** — all endpoints are open

---

## Service Availability History

| Date | Backend | Frontend | Mode Used |
|------|---------|----------|-----------|
| 2026-04-15 | DOWN | UP | Static |

---

## Established Baselines

No dynamic baselines yet (backend was down on first run). Establish on next live run:

| Endpoint | Target p95 | Target p99 | Baseline p50 |
|----------|-----------|-----------|--------------|
| `GET /api/work-items` | 100ms | 500ms | — |
| `GET /api/dashboard/summary` | 150ms | 500ms | — |
| `GET /api/dashboard/activity` | 150ms | 500ms | — |
| `GET /api/dashboard/queue` | 150ms | 500ms | — |
| `GET /health` | 50ms | 100ms | — |
| `GET /metrics` | 50ms | 100ms | — |

---

## Known Performance Hotspots

### 1. `dashboard.getActivity()` — **Highest Risk** (PERF-002, P1)
- Flattens ALL change history from ALL items into one array, then sorts it
- O(N×M × log(N×M)) per request where N=items, M=history_entries_per_item
- Pattern to detect: `for (item of items) { for (entry of item.changeHistory) { allEntries.push(...) } }`
- Fix: Global activity ring buffer, pre-sorted

### 2. `dashboard.getQueue()` — **Highest Risk** (PERF-003, P1)
- Returns full WorkItem objects (including changeHistory arrays) for entire dataset
- Pattern to detect: `items: grouped[status] || []` with no limit/projection
- Fix: Return summary projection only; add per-bucket limit

### 3. `store.findAll()` — **Scales Badly** (PERF-001, P2)
- 5 sequential .filter() passes + .sort() with Date parsing on every list request
- No secondary indexes — all reads are full table scans
- Pattern to detect: chained `.filter()` on `Array.from(items.values())`

### 4. `dependency.setDependencies()` — **Latency Spike on PATCH** (PERF-005, P2)
- K BFS cycle-detection passes for K new dependencies (called synchronously in PATCH handler)
- Gets expensive with deep/wide dependency graphs

---

## Useful Profiling Commands for This Stack

```bash
# Quick latency check (10 samples, report p95)
for i in $(seq 1 10); do
  curl -o /dev/null -s -w "%{time_total}\n" http://localhost:3001/api/work-items
done | sort -n | awk 'NR==10{print "p100:", $0} NR==9{print "p90:", $0} NR==8{print "p80:", $0}'

# Seed items for realistic load test
for i in $(seq 1 100); do
  curl -s -X POST http://localhost:3001/api/work-items \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Item $i\",\"description\":\"Load test item number $i for perf testing\",\"type\":\"feature\",\"priority\":\"medium\",\"source\":\"manual\"}" > /dev/null
done

# Dashboard activity stress (most expensive endpoint)
time curl -s "http://localhost:3001/api/dashboard/activity?limit=20" | wc -c

# Queue endpoint payload size check
curl -s http://localhost:3001/api/dashboard/queue | wc -c

# Metrics endpoint (check for latency histogram after fix)
curl -s http://localhost:3001/metrics | grep http_request_duration

# Check if k6 is available
which k6 && echo "k6 available" || echo "k6 not found — use parallel curl"

# Parallel curl load test (50 concurrent)
seq 1 50 | xargs -P 50 -I{} curl -o /dev/null -s -w "%{time_total}\n" \
  http://localhost:3001/api/work-items | sort -n
```

---

## Architecture Patterns to Watch

- **changeHistory spread vs push**: Inconsistent — some code uses `push()` (O(1)), others use `[...item.changeHistory, entry]` (O(n) copy). The spread pattern is used in dependency.ts and workflow.ts.
- **No HTTP latency middleware**: `metrics.ts` has domain counters only, no `http_request_duration_seconds` Histogram. This is a CLAUDE.md architecture rule violation.
- **In-memory store**: All performance issues are in-process CPU/GC. No DB query optimization applies. The bottlenecks are algorithmic (scan, sort) and serialization (payload size).

---

## Findings Summary by Run

| Date | P1 | P2 | P3 | Grade | Mode |
|------|----|----|----|----|------|
| 2026-04-15 | 2 | 4 | 2 | C | Static |
