# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-11-02

### Environment Mismatch (Critical Context)
The pen-tester's attack surface map (`Source/Backend/` — work-item/workflow domain) and the live service (`portal/Backend/` — feature-request/bug/cycle domain) are **different applications**. Always verify which application is exposed by `docker-compose.test.yml` before executing exploit chains.
- **docker-compose.test.yml** builds `portal/` directory → serves on `:3001`
- `Source/Backend/` is NOT the running service; pen-tester findings require adaptation

### Successful Exploit Chains

#### Chain 1: Unauthenticated Force-Approve (Critical)
- `POST /api/feature-requests` → `PATCH /:id {"status":"voting"}` → `POST /:id/force-approve`
- No auth at any step. All three requests return success with no credentials.
- `force-approve` is explicitly labeled "human override" but has zero auth guard.
- Symmetric: `POST /:id/deny` with `{"comment":"..."}` also requires no auth.
- **Evidence file:** attack-surface-map.md RED-001

#### Chain 2: Cycle Early Completion (High)
- `POST /api/cycles` → `POST /api/cycles/:id/complete`
- No status guard in `completeCycle()` — only checks for incomplete tickets.
- New cycles have 0 tickets → guard trivially passes → cycle jumps spec_changes → complete.
- Creates Feature + Learning records as if work was done. Marks associated work item completed.
- **Evidence file:** attack-surface-map.md RED-002

#### Chain 3: Full Data Exfiltration (High)
- `GET /api/feature-requests` returns ALL items (no pagination, no auth)
- `GET /api/dashboard/summary` returns real-time counts by status/severity
- `GET /metrics` returns 530+ lines of Prometheus operational data
- Three unauthenticated GETs exfiltrate complete system state

### Dead Ends / Ineffective Attacks

- **Bug state machine**: `reported → triaged → close` is properly guarded ("Cannot close: bug is 'triaged', expected 'resolved'"). Bug transitions validate expected source status.
- **Feature request status transitions (PATCH)**: Transition map IS enforced: `potential → approved` returns "Invalid status transition: potential → approved. Allowed: voting, duplicate, deprecated". State machine works for PATCH.
- **SQL injection in title**: Title field stored safely (parameterized queries). SQLi attempt stored literally as a string. No injection.
- **Status field SQLi**: "Invalid status: voting; DROP TABLE..." — status enum validated before DB write.
- **CORS bypass**: evil.example.com gets 204 preflight without `Access-Control-Allow-Origin` header — browser would block, so effectively mitigated. Not an exploitable path.
- **Input length limits**: Portal backend has explicit limits (title: 200, description: 10,000 chars). Express 16KB body limit enforces this at transport before service validation.
- **Dependency cascade auto-dispatch**: The `ready` endpoint works but cascade auto-dispatch to advanced states does not fire automatically in portal backend — different architecture from Source/Backend.

### Probed Endpoints (Portal Backend)

| Endpoint | Auth Required | Result |
|---|---|---|
| `GET /api/feature-requests` | None | Full enumeration, all items |
| `POST /api/feature-requests` | None | Item creation succeeded |
| `PATCH /api/feature-requests/:id` | None | Status transitions validated by enum |
| `POST /api/feature-requests/:id/force-approve` | None | **BREACH: approves without votes** |
| `POST /api/feature-requests/:id/deny` | None | **BREACH: denies without auth** |
| `POST /api/feature-requests/:id/vote` | None | Vote added without auth |
| `POST /api/feature-requests/:id/dependencies` | None | Dependency added without auth |
| `GET /api/bugs` | None | Full enumeration |
| `POST /api/bugs` | None | Bug creation succeeded |
| `POST /api/bugs/:id/triage` | None | Triage succeeded |
| `POST /api/bugs/:id/close` | None | Properly blocked by state machine |
| `POST /api/cycles` | None | Cycle creation succeeded |
| `POST /api/cycles/:id/complete` | None | **BREACH: early completion** |
| `GET /api/dashboard/summary` | None | Full operational counts exposed |
| `GET /metrics` | None | Full Prometheus data exposed |
| `GET /api/search` | None | Search exposed without auth |

### Rate Limiting
- Confirmed: ZERO rate limiting on any endpoint
- 20 rapid POST requests all returned 201 - no 429 observed
- No `X-RateLimit-*` headers in any response

### Effective Attack Pattern
The most effective pattern for this codebase:
1. No auth → every endpoint reachable
2. State machine bypass: find endpoints labeled "override" or "force" — these typically lack status-prerequisite guards
3. Cycle completion specifically: guards only check ticket completion, not lifecycle phase
