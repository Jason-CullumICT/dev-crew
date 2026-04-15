# TheInspector — System Health Audit
**Grade: D** · 2026-04-15 · Branch: `audit/inspector-2026-04-15-82a27c` · Run: `run-20260415-022207`

> **🚨 ESCALATION → TheGuardians:**
> Two security findings confirmed live — DEP-001 (Handlebars RCE, CVSS 9.8) and CHAOS-001 (SSRF via orchestrator path traversal). See [Escalation details](#15--recommendations--escalation) below.

Full HTML report: `Teams/TheInspector/findings/audit-2026-04-15-D.html`
Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-2026-04-15.json`

---

## 1 · Header

| Field | Value |
|-------|-------|
| Grade | **D** (6 P1s, 19 P2s — exceeds C threshold of max_p1=2, max_p2=15) |
| Date | 2026-04-15 |
| Branch | `audit/inspector-2026-04-15-82a27c` |
| Scope | Full codebase — first audit, no prior baseline |
| Specialists | quality-oracle (static) · dependency-auditor (static) · performance-profiler (static) · chaos-monkey (dynamic+static) |

---

## 2 · Scorecards

| Specialist | P1 | P2 | P3 | P4 | Mode | Grade |
|------------|----|----|----|----|------|-------|
| Quality Oracle | 0 | 5 | 3 | 2 | static | B |
| Dependency Auditor | 1 | 2 | 9 | 0 | static | C |
| Performance Profiler | 2 | 4 | 2 | 0 | static (backend down) | C |
| Chaos Monkey | 3 | 8 | 9 | 3 | dynamic+static | D |
| **TOTAL** | **6** | **19** | **23** | **5** | | **D** |

**Spec coverage:** 82% (71 req, 58 traced) · **Escalations → TheGuardians:** 5 · **Fixed:** 0 (first audit)

---

## 3 · Executive Summary

**Top 5 findings an operator needs to know:**

1. **🚨 SSRF confirmed live** (CHAOS-001) — `GET /api/orchestrator/../../health` returns HTTP 200 from the backend's own health endpoint. Any internal route is reachable without authentication. The orchestrator proxy concatenates `req.url` without path sanitisation.

2. **🚨 Handlebars RCE (CVSS 9.8)** (DEP-001) — `handlebars@4.7.8` in Source/Backend has 7 CVEs including code injection via AST type confusion. Fix is one command: `npm update handlebars`. Requires TheGuardians validation.

3. **Dashboard will timeout at scale** (PERF-002, PERF-003) — `getActivity()` builds a full cross-product of all work items × all change history entries and sorts it on every request (O(N×M log N×M)). `getQueue()` serialises full WorkItem objects with unbounded nested arrays — ~1 MB at 500 items. Both will breach p95 <150ms budget well before production scale.

4. **Both backends will crash hard on container stop** (CHAOS-003, CHAOS-004) — No SIGTERM/SIGINT handlers, no uncaughtException/unhandledRejection handlers. SQLite WAL not flushed on shutdown. `closeDb()` is dead code (defined but never called). Every deploy or pod eviction drops in-flight requests and risks WAL corruption.

5. **Error handling and data integrity gaps** (CHAOS-006/007/009/010) — Invalid JSON body → 500 (should be 400). Pagination `?limit=99999` dumps entire database. `updateFeatureRequest`/`updateBug` use unprotected read-then-write (race condition under concurrency). SQLite has no `busy_timeout` — any write contention → immediate 500.

---

## 4 · Scope & Environment

| Item | Detail |
|------|--------|
| Audit mode | Full codebase (first audit — no prior baseline) |
| Services at audit start | portal/Backend (3001) ✅ UP · Frontend (5173) ✅ UP · Source/Backend ❌ DOWN |
| Quality Oracle | static · 71 requirements · enforcer scans Source/ + E2E only |
| Performance Profiler | static (Source/Backend unreachable) · 19 endpoints inventoried from route files |
| Chaos Monkey | dynamic+static · 35 faults injected against portal/Backend · Source/Backend static only |
| Dependency Auditor | static · npm audit across 6 projects · 588 direct + 1,987 transitive deps |
| **Data caveats** | Performance figures are static projections — no live p50/p95/p99 available. Chaos dynamic tests targeted portal/Backend only. |

---

## 5 · Trend

**First audit — no baseline.** All 53 findings are NEW. The next audit will produce FIXED / STILL OPEN / REGRESSED / NEW comparisons.

---

## 6 · Specialist Reports

### Quality Oracle — Grade B
Mode: static · Spec coverage: 82% (71 req, 58 traced) · P1: 0 · P2: 5 · P3: 3 · P4: 2

Found 71 requirements across 4 plans/specs; 58 traced. The enforcer has a significant blind spot: `portal/` (1,068 Verifies comments, ~32 FRs) and `platform/` (10 FR-TMP-* requirements) are never scanned — a failing test or deleted comment would pass all CI gates silently. Three dependency-linking implementation gaps remain open. The `GET /api/search` route is absent from Source/Backend despite 5 tests expecting it.

### Dependency Auditor — Grade C
Mode: static · 6 npm projects · 2,575 total deps · 15 CVEs (1 critical, 3 high, 11 moderate)

Critical: `handlebars@4.7.8` in Source/Backend with 7 CVEs (CVSS 9.8). High: path-to-regexp ReDoS (portal/Backend, platform/orchestrator), picomatch ReDoS (portal/Frontend). Six packages are 1+ major versions behind; OpenTelemetry in portal/Backend is 160+ minor versions behind.

### Performance Profiler — Grade C
Mode: static (Source/Backend unreachable) · 19 endpoints discovered · P1: 2 · P2: 4 · P3: 2

`getActivity()` and `getQueue()` in `dashboard.ts` will violate the p95 <150ms budget at any meaningful scale. `findAll()` runs 5 sequential O(n) filter passes + O(n log n) sort with `new Date()` parsing on every list request. Missing `http_request_duration_seconds` Histogram violates CLAUDE.md observability architecture rule.

### Chaos Monkey — Grade D
Mode: dynamic+static · 35 faults injected · 18 invariants checked · Services UP at close

**Note:** Port 3001 is the portal backend (`portal/Backend/`), not Source/Backend — dynamic tests cover portal only. 5 dynamic tests failed: invalid JSON → 500, XSS stored verbatim, oversized payload → 500, pagination unbounded, SSRF confirmed. Static analysis confirmed: no SIGTERM handlers, no process error handlers, no SQLite busy_timeout, concurrent write race on state transitions.

---

## 7 · Re-Verification Summary

First audit — all findings are NEW. No prior P1/P2 findings on record for any specialist.

| Specialist | NEW | FIXED | STILL OPEN | REGRESSED |
|------------|-----|-------|-----------|-----------|
| Quality Oracle | 10 | — | — | — |
| Dependency Auditor | 12 | — | — | — |
| Performance Profiler | 8 | — | — | — |
| Chaos Monkey | 23 | — | — | — |
| **TOTAL** | **53** | 0 | 0 | 0 |

---

## 8 · Cross-Reference Map

Root causes spanning multiple specialists — a single fix resolves findings from 2+ agents.

| Root Cause | Affected Findings | Single Fix | Impact |
|------------|-------------------|------------|--------|
| No projection layer — list endpoints return full objects with unbounded nested arrays | PERF-001, PERF-003, PERF-004, CHAOS-007, CHAOS-011, CHAOS-023 | Add `toListView()` projection in store; enforce pagination clamp (1 ≤ limit ≤ 100) on all list routes | **6 findings · 2 specialists** |
| Dashboard loads entire dataset on every request without pre-aggregation | PERF-002, PERF-003, CHAOS-011 | Activity ring buffer (Source/Backend); LIMIT per-table for portal dashboard | **3 findings · 2 specialists · prevents p95 breach** |
| Missing Node.js process lifecycle management | CHAOS-003, CHAOS-004, CHAOS-018 | Add SIGTERM/SIGINT handlers → closeDb() → exit(0); add uncaughtException/unhandledRejection | **3 findings · 1 file per backend** |
| Error middleware does not handle specific HTTP error types | CHAOS-006, CHAOS-013, CHAOS-017 | Extend `errorHandler.ts`: SyntaxError→400, entity.too.large→413, method-not-allowed→405 | **3 findings · 1 file edit** |
| Traceability enforcer blind spots + regex issues | QO-002, QO-003, QO-005, QO-008, QO-010 | Overhaul `tools/traceability-enforcer.py`: extend scan dirs; fix ID extraction regex; add plan marker | **5 findings · closes 18% coverage gap** |

---

## 9 · P1 Findings

### DEP-001 · P1 · `[ESCALATE → TheGuardians]`
**Handlebars.js 4.7.8 — multiple RCE vectors via JavaScript injection (CVSS 9.8)**
- **File:** `Source/Backend/package-lock.json`
- **Exploit:** User-controlled data rendered via Handlebars template allows server-side code injection. 7 CVEs including GHSA-2w6w-674q-4c4q (CVSS 9.8 — AST type confusion), GHSA-xjpj-3mr7-gcpf (CVSS 8.3 — CLI injection), GHSA-2qvq-rjwj-gvw9 (prototype pollution).
- **Impact:** Remote code execution if user input reaches any Handlebars template.
- **Fix:** `cd Source/Backend && npm update handlebars` → target 4.7.9+. TheGuardians to validate no user-controlled template rendering exists.

### CHAOS-001 · P1 · `[ESCALATE → TheGuardians]`
**SSRF via orchestrator proxy path traversal — confirmed live exploit**
- **File:** `portal/Backend/src/index.ts:75`
- **Exploit:** `GET /api/orchestrator/../../health` → HTTP 200 from backend's own `/health`. `req.url` is concatenated onto orchestrator base URL without sanitisation. Any internal route reachable: `/api/orchestrator/../../api/bugs`, `/api/orchestrator/../../api/feature-requests`, etc.
- **Impact:** Data exfiltration, internal service pivoting, potential auth bypass if any internal-only routes exist.
- **Fix:** Validate path does not contain `..` segments. Use `new URL(path, base).pathname` normalisation; assert resolved path stays within orchestrator's allowed prefix.

### PERF-002 · P1
**`getActivity()` — O(N×M) memory + O(N×M log N×M) sort on every dashboard request**
- **File:** `Source/Backend/src/services/dashboard.ts:32`
- **Detail:** For every request, all work items × all change history entries are spread into one array and sorted with `new Date()` called twice per comparison. At 500×20 items: 10,000 objects; at 1,000×50: 50,000 objects sorted every request.
- **Fix:** Global pre-sorted ring buffer (cap ~1,000). Push to ring on every `changeHistory` write. O(N×M log N×M) → O(1) per request.

### PERF-003 · P1
**`getQueue()` returns full WorkItem objects with unbounded `changeHistory[]` for entire dataset**
- **File:** `Source/Backend/src/services/dashboard.ts:57`
- **Detail:** Each WorkItem includes `changeHistory[]`, `assessments[]`, `blockedBy[]`, `blocks[]`. At 500 items the response is ~1 MB. No per-bucket limit.
- **Fix:** Return summary projections only (`id, docId, title, status, priority, assignedTeam`). Add per-bucket limit (default 10).

### CHAOS-002 · P1
**No timeout on orchestrator `fetch()` — infinite hang cascades to connection pool exhaustion**
- **File:** `portal/Backend/src/index.ts:112`
- **Detail:** No `AbortController` anywhere in proxy code. A hanging orchestrator holds all Express handler slots indefinitely. The SSE pump loop compounds this — `reader.read()` blocks forever unless the client disconnects.
- **Fix:** `const ac = new AbortController(); setTimeout(() => ac.abort(), 30_000); fetch(url, {...opts, signal: ac.signal})`. Return 504 on abort.

### CHAOS-003 · P1
**No SIGTERM/SIGINT handlers — hard kill on container stop, SQLite WAL not flushed**
- **Files:** `portal/Backend/src/index.ts:155`, `Source/Backend/src/app.ts:48`
- **Detail:** SIGTERM kills both backends instantly. `closeDb()` is defined but never called in production. SQLite WAL may not be flushed; in-flight requests receive TCP RST; no log emitted on shutdown.
- **Fix:** `process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown)` where shutdown calls `server.close() → closeDb() → process.exit(0)` with 15s force-kill fallback.

---

## 10 · Risk Matrix

|  | Zero-precondition | Authenticated | Privileged | Admin | Physical |
|--|-------------------|---------------|-----------|-------|---------|
| **P1** | CHAOS-001 (SSRF) · PERF-002 (activity sort) · PERF-003 (queue payload) · CHAOS-002 (fetch timeout) | DEP-001 (Handlebars RCE — requires template render of user input) | — | — | CHAOS-003 (SIGTERM — container stop) |
| **P2** | CHAOS-007 (pagination DoS) · CHAOS-011 (dashboard scans) · DEP-002 (path-to-regexp ReDoS) · CHAOS-006 (invalid JSON 500) | CHAOS-009 (concurrent race) · PERF-001 (findAll scans) | PERF-004 (large list) | — | CHAOS-004 (unhandled rejection) |
| **P3** | CHAOS-020 (stored XSS) · CHAOS-019 (no rate limit) | CHAOS-016 (CORS credentials) | — | — | — |
| **P4** | — | — | — | — | — |

---

## 11 · Spec Coverage

| Plan / Spec | Requirements | Traced | Coverage |
|-------------|-------------|--------|----------|
| Plans/self-judging-workflow (FR-WF-*) | 13 | 13 | **100%** ✅ |
| Plans/dev-workflow-platform (FR-001–032) | 32 | ~32 (portal/ — enforcer blind) | **~100%** ⚠️ |
| Plans/dependency-linking (FR-dependency-*) | 16 | 13 | **81%** — 3 open |
| Specifications/tiered-merge-pipeline (FR-TMP-*) | 10 | 0 | **0%** ❌ |
| **TOTAL** | **71** | **~58** | **~82%** |

**Caveat:** dev-workflow-platform coverage is inferred — enforcer does not scan `portal/`. True enforcer-validated coverage is lower (~44% for Source/ + E2E only).

**Top 10 uncovered requirements:**
1. `FR-dependency-api-types` — `blocked_by` missing from UpdateBugInput/UpdateFeatureRequestInput; frontend uses `as any`
2. `FR-dependency-seed` — `portal/Backend/src/database/seed.ts` does not exist
3. `FR-dependency-frontend-tests` — DependencySection.test.tsx + BlockedBadge.test.tsx missing
4–10. `FR-TMP-001` through `FR-TMP-007` — tiered-merge-pipeline implemented in platform/ with zero Verifies comments

---

## 12 · Latency Baselines

No live measurements — Source/Backend was unreachable. All figures are static projections.

| Endpoint | Budget p95 | Projected Risk | Finding |
|----------|-----------|----------------|---------|
| `GET /api/dashboard/activity` | 150ms | **HIGH — will breach at scale** (O(NxM) sort) | PERF-002 |
| `GET /api/dashboard/queue` | 150ms | **HIGH — ~1MB payload at 500 items** | PERF-003 |
| `GET /api/work-items` | 100ms | **MEDIUM** — 5 O(n) filters + sort | PERF-001, PERF-004 |
| `PATCH /api/work-items/:id` (deps) | 200ms | **MEDIUM** — O(K × BFS) cycle detection | PERF-005 |
| `GET /metrics` | — | Missing Histogram — cannot detect violations | PERF-006 |
| All other endpoints | 200ms | LOW (no static issues) | — |

---

## 13 · P2 Findings

| ID | Category | Title | File | Source | Status |
|----|----------|-------|------|--------|--------|
| QO-001 | spec-drift | GET /api/search route missing — 5 tests will fail | `Source/Backend/src/routes/` | quality-oracle | NEW |
| QO-002 | arch-violation | Enforcer never scans portal/ — 1,068 Verifies comments unvalidated | `tools/traceability-enforcer.py` | quality-oracle | NEW |
| QO-003 | tooling | Enforcer false-failure on dependency-linking plan (7 phantom FR-IDs) | `tools/traceability-enforcer.py` | quality-oracle | NEW |
| QO-004 | spec-drift | 3 open dependency-linking gaps: api-types, seed.ts, 2 test files | `portal/Shared/, portal/Backend/, portal/Frontend/tests/` | quality-oracle | NEW |
| QO-005 | spec-drift | FR-TMP-001–010 — zero enforced traceability in platform/ | `Specifications/tiered-merge-pipeline.md` | quality-oracle | NEW |
| DEP-002 | CVE-DoS | path-to-regexp ReDoS CVSS 7.5 in portal/Backend + platform/orchestrator | Multiple | dependency-auditor | NEW |
| DEP-003 | CVE-DoS | picomatch ReDoS + prototype pollution CVSS 7.5 in portal/Frontend | `portal/Frontend/package-lock.json` | dependency-auditor | NEW |
| PERF-001 | algorithmic | findAll() 5 sequential O(n) filters + O(n log n) sort with Date parsing | `store/workItemStore.ts:30` | performance-profiler | NEW |
| PERF-004 | unbounded | List response includes full changeHistory[] + assessments[] per item | `routes/workItems.ts:60` | performance-profiler | NEW |
| PERF-005 | algorithmic | setDependencies() BFS cycle detection runs K times instead of once | `services/dependency.ts:220` | performance-profiler | NEW |
| PERF-006 | observability | Missing http_request_duration_seconds Histogram | `src/metrics.ts` | performance-profiler | NEW |
| CHAOS-004 | error-handling | No uncaughtException/unhandledRejection handlers — silent process death | Both backends | chaos-monkey | NEW |
| CHAOS-005 | recovery-failure | GET /api/dashboard 404 in live portal backend | `portal/Backend/src/index.ts:64` | chaos-monkey | NEW |
| CHAOS-006 | error-handling | Invalid JSON body → HTTP 500 instead of 400 | `portal/Backend errorHandler.ts` | chaos-monkey | NEW |
| CHAOS-007 | resource-leak | Pagination not validated — ?limit=99999 dumps full dataset | `portal/Backend routes` | chaos-monkey | NEW |
| CHAOS-008 | error-handling | SSE stream errors silently swallowed — .catch(() => res.end()) | `portal/Backend/src/index.ts:130` | chaos-monkey | NEW |
| CHAOS-009 | state-invariant | Read-then-write not in transaction — concurrent state double-apply race | `featureRequestService.ts:251, bugService.ts:184` | chaos-monkey | NEW |
| CHAOS-010 | resource-leak | No SQLite busy_timeout — SQLITE_BUSY on write contention → 500 | `portal/Backend/src/database/connection.ts:19` | chaos-monkey | NEW |
| CHAOS-011 | resource-leak | Dashboard activity: 6 unbounded SELECT * merged in memory | `portal/Backend/src/services/dashboardService.ts` | chaos-monkey | NEW |

---

## 14 · Fixed Findings

None — first audit. No prior findings to verify as fixed.

---

## 15 · Recommendations & Escalation

### 🚨 Escalation → TheGuardians

```
⚠  ESCALATION → TheGuardians
   Audit   : run-20260415-022207
   Branch  : audit/inspector-2026-04-15-82a27c
   Grade   : D

   Finding 1 (P1): Handlebars.js 4.7.8 — multiple RCE vectors via JavaScript injection
                   CVSS 9.8 · Source/Backend/package-lock.json
                   Fix: npm update handlebars → 4.7.9+
                   ID  : DEP-001

   Finding 2 (P1): SSRF via orchestrator proxy path traversal — confirmed live exploit
                   portal/Backend/src/index.ts:75
                   GET /api/orchestrator/../../health → HTTP 200 (internal health endpoint)
                   ID  : CHAOS-001

   Finding 3 (P3): CORS advertises PATCH/DELETE (unimplemented); credentials flag scope review needed
                   portal/Backend/src/index.ts:34  · ID: CHAOS-016

   Finding 4 (P3): No rate limiting on orchestrator proxy — unauthenticated request amplification
                   portal/Backend/src/index.ts     · ID: CHAOS-019

   Finding 5 (P3): Stored XSS — raw HTML/JS accepted and stored verbatim
                   portal/Backend services          · ID: CHAOS-020

   When: Before next release. Trigger TheGuardians audit now.
   How : Read Teams/TheGuardians/team-leader.md and follow it exactly.
         Target: ephemeral isolated environment (required).

   Non-security findings (P1–P4) → TheFixer backlog
   See: Teams/TheInspector/findings/bug-backlog-2026-04-15.json
```

### 🚫 Block Deployment
1. DEP-001 — `npm update handlebars` in Source/Backend → TheGuardians validate
2. CHAOS-001 — Sanitize orchestrator proxy path; block `..` segments; URL normalisation
3. PERF-002 — Activity ring buffer (replaces O(NxM) sort)
4. PERF-003 — Queue summary projections + per-bucket limit
5. CHAOS-002 — AbortController (30s timeout) on orchestrator fetch()
6. CHAOS-003 + CHAOS-004 + CHAOS-018 — Process signal + error handlers → closeDb() *(Cross-Ref C — 3 findings, 1 code block per backend)*

### ⚡ This Sprint
- DEP-002, DEP-003 — `npm audit fix` for path-to-regexp + picomatch CVEs
- CHAOS-006 + CHAOS-013 + CHAOS-017 — Extend errorHandler.ts *(Cross-Ref D — 3 findings, 1 file)*
- CHAOS-007 + CHAOS-023 — Validate/clamp pagination; add DB-level LIMIT
- CHAOS-009 — Wrap updateFeatureRequest/updateBug in `db.transaction()`
- CHAOS-010 — `db.pragma('busy_timeout = 5000')` in connection.ts
- CHAOS-011 + PERF-001 + PERF-004 — Projection layer + pagination *(Cross-Ref A — 6 findings)*
- PERF-006 — Add `http_request_duration_seconds` Histogram + response timing middleware
- QO-001 — Implement `GET /api/search` route in Source/Backend
- QO-002 + QO-003 — Overhaul traceability-enforcer.py *(Cross-Ref E — 5 findings, 1 file)*
- QO-004 — Route to TheFixer: blocked_by types, seed.ts, DependencySection + BlockedBadge tests
- CHAOS-005 — Investigate portal/Backend dashboard router 404 (check startup logs)

### 📅 Next Sprint
- QO-005 — Formal spec-exemption decision for platform/ in CLAUDE.md, or add traces
- PERF-005 — Consolidated single-pass BFS in setDependencies()
- DEP-004 — Plan Vite 8+ / Vitest 4+ migration
- DEP-006, DEP-008 — pino 8→10, uuid 9→13 in Source/Backend
- DEP-009 — OpenTelemetry packages in portal/Backend (160+ versions behind)
- CHAOS-016, CHAOS-019, CHAOS-020 — TheGuardians security sprint
- QO-006, QO-007, PERF-007, PERF-008 — Code quality cleanup

### 📦 Backlog
- DEP-007 — React 19 + react-router-dom 7 migration planning
- DEP-010–012 — Dependency bloat + deduplication; portal/Backend dedupe; npm audit in CI/CD
- CHAOS-012–015, CHAOS-021, CHAOS-022 — Minor error handling + validation
- QO-008, QO-009, QO-010 — FR-ID alignment, missing tests, enforcer active-plan marker
- Set up Dependabot/Renovate; add `npm audit --audit-level=high` to CI/CD pipeline

---

## 16 · P3/P4 Summary

| ID | Sev | Category | Title | Source |
|----|-----|----------|-------|--------|
| QO-006 | P3 | pattern-violation | Dual logger abstraction in Source/Backend | quality-oracle |
| QO-007 | P3 | pattern-violation | 2 eslint-disable react-hooks/exhaustive-deps suppressions | quality-oracle |
| QO-008 | P3 | spec-drift | Portal uses non-canonical FR-dependency-* IDs vs plan | quality-oracle |
| DEP-004 | P3 | CVE-moderate | Vite path traversal + esbuild dev CSRF | dependency-auditor |
| DEP-005 | P3 | CVE-DoS | brace-expansion DoS CVSS 6.5 in Source/Backend | dependency-auditor |
| DEP-006 | P3 | outdated | pino 8.17.0 → 10.3.1 (2 major versions behind) | dependency-auditor |
| DEP-007 | P3 | outdated | React 18→19, react-router-dom 6→7 available | dependency-auditor |
| DEP-008 | P3 | outdated | uuid 9.0.0 → 13.0.0 (4 major versions behind) | dependency-auditor |
| DEP-009 | P3 | outdated | OpenTelemetry 160+ minor versions behind in portal/Backend | dependency-auditor |
| DEP-010 | P3 | supply-chain | portal/Backend 577 transitive dependencies | dependency-auditor |
| DEP-011 | P3 | supply-chain | picomatch 4 duplicate instances in portal/Frontend | dependency-auditor |
| DEP-012 | P3 | supply-chain | Source/Backend 310 dev vs 102 prod deps (3:1 ratio) | dependency-auditor |
| PERF-007 | P3 | algorithmic | changeHistory O(n) spread-copy on every write vs push() | performance-profiler |
| PERF-008 | P3 | algorithmic | computeHasUnresolvedBlockers() called redundantly before isReady() | performance-profiler |
| CHAOS-012 | P3 | resource-leak | No explicit body size limit on Source/Backend | chaos-monkey |
| CHAOS-013 | P3 | error-handling | Oversized payload returns 500 instead of 413 | chaos-monkey |
| CHAOS-014 | P3 | error-handling | No try/catch in intake webhook route handlers | chaos-monkey |
| CHAOS-015 | P3 | state-invariant | No enum validation in intake routes | chaos-monkey |
| CHAOS-016 | P3 🚨 | security | CORS advertises unimplemented methods; credentials flag review [TheGuardians] | chaos-monkey |
| CHAOS-017 | P3 | error-handling | Method not allowed returns 404 HTML instead of 405 JSON | chaos-monkey |
| CHAOS-018 | P3 | recovery-failure | closeDb() dead code in production | chaos-monkey |
| CHAOS-019 | P3 🚨 | security | No rate limiting on any endpoint (esp. orchestrator proxy) [TheGuardians] | chaos-monkey |
| CHAOS-020 | P3 🚨 | security | Stored XSS — raw HTML/JS stored verbatim [TheGuardians] | chaos-monkey |
| QO-009 | P4 | untested | 7 Source/Frontend components/hooks lack test files | quality-oracle |
| QO-010 | P4 | tooling | Enforcer default mode targets stale plan (most-recently-modified) | quality-oracle |
| CHAOS-021 | P4 | state-invariant | updateWorkItem store has no field whitelist | chaos-monkey |
| CHAOS-022 | P4 | error-handling | parseInt NaN not explicitly validated in dashboard route | chaos-monkey |
| CHAOS-023 | P4 | resource-leak | No database-level pagination in portal/Backend list queries | chaos-monkey |

---

## Bug Backlog JSON (summary)

Full file: [`Teams/TheInspector/findings/bug-backlog-2026-04-15.json`](Teams/TheInspector/findings/bug-backlog-2026-04-15.json)

```json
{
  "audit_id": "run-20260415-022207",
  "audit_date": "2026-04-15",
  "grade": "D",
  "summary": {
    "p1_total": 6,
    "p2_total": 19,
    "p3_total": 23,
    "p4_total": 5,
    "spec_coverage_pct": 82,
    "escalations_to_guardians": 5
  },
  "escalations": ["DEP-001", "CHAOS-001", "CHAOS-016", "CHAOS-019", "CHAOS-020"],
  "p1_findings": ["DEP-001", "PERF-002", "PERF-003", "CHAOS-001", "CHAOS-002", "CHAOS-003"],
  "cross_reference_groups": 5
}
```

---

*Generated by TheInspector · run-20260415-022207 · 2026-04-15*
*Specialists: quality-oracle · dependency-auditor · performance-profiler · chaos-monkey*
