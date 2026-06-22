Ephemeral environment destroyed. Here is the full Red Team Report:

---

## 🔴 Red Team Results — 2026-06-22

**Target:** Portal Backend (`portal/Backend`) at `http://localhost:3001`  
**Environment:** Ephemeral `docker-compose.test.yml` (SQLite tmpfs, destroyed post-run)

> **⚠️ Note on Target Mismatch:** The pen-tester analyzed `Source/Backend` (the workflow engine). The test environment runs `portal/Backend` (feature-request/bug-tracking portal). Vulnerability classes matched perfectly; object types differ. All four security objectives were re-verified against the live application.

---

### RED-001 — Complete Authentication Absence ✅ CONFIRMED CRITICAL
Every endpoint (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/metrics`, `/api/search`) responds with HTTP 200/201 to requests with zero Authorization header. No auth middleware exists in `portal/Backend/src/index.ts`.

### RED-002 — Force-Approve Overrides AI Governance (3-2 Deny Majority) ✅ CONFIRMED CRITICAL
**Objective: "Bypass work item state machine."** In 3 unauthenticated requests: created FR-0001 → triggered voting (result: 3 deny / 2 approve) → called `/force-approve`. Result: `status: "approved"`, `human_approval_approved_at` set. The AI governance layer (5 independent agent votes) was fully bypassed. No identity, no permission check.

### RED-003 — Permanent Dispatch Sabotage via Soft-Deleted Blocker ✅ CONFIRMED HIGH
**Objective: "Access or modify a soft-deleted work item via direct ID reference."** Created FR-0027 (victim) blocked by FR-0028. Deleted FR-0028. FR-0027 now permanently shows `has_unresolved_blockers: true` with ghost reference `{"title":"Unknown","status":"unknown"}`. No API path exists to recover FR-0027 without direct DB access.

### RED-004 — Full Data Enumeration — Pagination Completely Absent ✅ CONFIRMED HIGH
**Objective: "Enumerate all work items without pagination limit enforcement."** `?limit=1` was silently ignored — all 26 items returned. `GET /api/search` (no query) returned the full cross-entity corpus in one response.

### RED-005 — Audit Trail Injection — 5,116-char XSS Payload Stored ✅ CONFIRMED HIGH
**Objective: "Submit a malformed assessment verdict."** Injected `<script>alert(1)</script>` + fake admin metadata into the `human_approval_comment` field via unauthenticated `/deny`. Stored verbatim. Any UI rendering without output-encoding executes the script. Forensic analysis is poisoned.

### RED-006 — Prometheus Metrics Unauthenticated ✅ CONFIRMED HIGH
`GET /metrics` leaked Node.js v22.23.0, 134MB RSS, event loop lag baseline, file descriptor count, and operational counters — zero auth required.

### RED-007 — Search Full-Dump on Empty Query ✅ CONFIRMED MEDIUM
`GET /api/search?q=` returns all items across entity types. Second enumeration path independent of list endpoints.

### RED-008 — CORS Correctly Configured (Defense Holding) ℹ️ INFORMATIONAL
Browser-based CSRF is blocked — only `http://localhost:5173` gets the ACAO header. However, since there is no authentication, any non-browser client bypasses this completely.

### RED-009 — State Machine Transitions Properly Enforced ✅ DEFENSE CONFIRMED
All illegal state jumps via PATCH and dedicated transition endpoints were rejected with clear error messages. The state machine logic is solid — the problem is that none of the *valid* privileged transitions (force-approve) are protected by auth.

---

**Red Team Grade: F** — All four stated objectives confirmed exploitable in the live environment. A single unauthenticated HTTP call overrides AI-consensus governance (RED-002), which constitutes a confirmed breach of a critical business objective.
