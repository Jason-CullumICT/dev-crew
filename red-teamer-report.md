## Red Team Report — TheGuardians

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — portal backend on `localhost:3001`  
**Date:** 2026-11-02

---

### Summary

All four pentest objectives were successfully breached. **5 confirmed live exploits** were executed against the running service with zero credentials. The application has no authentication on any endpoint.

---

### Confirmed Breaches

#### 🔴 RED-001 — Unauthenticated Force-Approve (Critical)
**Objective Achieved: "Bypass work item state machine"**

Three unauthenticated requests fully bypass the community voting process:
```bash
POST /api/feature-requests        # create item (status: potential)
PATCH /api/feature-requests/FR-007 -d '{"status":"voting"}'    # move to voting
POST /api/feature-requests/FR-007/force-approve                # APPROVED — 0 votes
```
**Result:** `{"status":"approved","votes":[],"human_approval_approved_at":"2026-11-02T10:52:17.920Z"}`  
The "human override" endpoint has zero authentication middleware.

#### 🔴 RED-002 — Cycle Early Completion (High)
**Objective Achieved: "Bypass work item state machine"**

A cycle in `spec_changes` (initial phase) can be immediately completed — skipping all development phases:
```bash
POST /api/cycles        # creates CYCLE-0001 in spec_changes status
POST /api/cycles/CYCLE-0001/complete  # COMPLETE — no phase progression
```
`completeCycle()` only checks for incomplete tickets; new cycles have zero tickets so the guard trivially passes. Side effects: auto-creates Feature + Learning records as if real work was done.

#### 🔴 RED-003 — Full Data Exfiltration (High)
**Objective Achieved: "Enumerate all work items without pagination limit enforcement"**

Three GETs dump the entire system state with no credentials:
```bash
GET /api/feature-requests      # ALL 31 items, full detail, no pagination cap
GET /api/dashboard/summary     # real-time counts by status/severity
GET /metrics                   # 531-line Prometheus dump (transition counts, request patterns)
```

#### 🔴 RED-004 — No Rate Limiting (High)
20 rapid POST requests → 20 HTTP 201 responses. No 429, no `Retry-After`, no throttle of any kind.

#### 🔴 RED-005 — Unauthenticated Deny (High)
**Objective Achieved: "Submit malformed verdict bypassing routing logic" (analog)**

Symmetric with RED-001: any anonymous caller can deny any feature request:
```bash
POST /api/feature-requests/FR-0032/deny -d '{"comment":"..."}' → {"status":"denied"}
```

---

### Dead Ends
- Bug state machine transitions ARE properly guarded (correct status prerequisite enforcement)
- PATCH status transitions enforce allowed-transition maps (SQL injection in status field rejected)
- Input length limits are enforced (title ≤ 200, description ≤ 10,000 chars)
- SQL injection in title stored safely via parameterized queries
- CORS correctly blocks evil.example.com (no `Access-Control-Allow-Origin` returned)

---

### Grade Assessment
Per `security.config.yml`: confirmed red-team breach of a critical objective → **Grade F**

Full details appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
