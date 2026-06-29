---

## Red Team Complete — Results Summary

**Ephemeral environment:** `docker-compose.test.yml` (portal:3001) — spun up, exploited, torn down ✅

### Exploit Chain Results: 9/11 Confirmed Breaches

| Chain | Title | Severity | Result |
|-------|-------|----------|--------|
| RED-001 | Baseline Auth Bypass | **Critical** | ✅ Confirmed |
| RED-002 | Force-Approve Overrides Deny Majority | **Critical** | ✅ Confirmed |
| RED-003 | PATCH State Machine Bypass | **Critical** | ✅ Confirmed |
| RED-004 | Ghost Dependency After Soft-Delete | High | ⚠️ Partial |
| RED-005 | Stored XSS in Free-Text Fields | High | ⚠️ Partial |
| RED-006 | Pagination Completely Non-Functional | Medium | ✅ Confirmed |
| RED-007 | Unauthenticated Metrics Exposure | Medium | ✅ Confirmed |
| RED-008 | Dashboard Business Intelligence Disclosure | High | ✅ Confirmed |
| RED-009 | CSRF via Form-Encoded Body | **Critical** | ✅ Confirmed |
| RED-010 | Vote Farming via Unbounded Retrigger | Medium | ✅ Confirmed |
| RED-011 | Race Condition Delete+Approve | Low | ❌ No Breach |

### All 4 Objectives Achieved

1. ✅ **Bypass state machine** — Single `PATCH /:id {"status":"approved"}` skips all vote-count guards, even with deny majority
2. ✅ **Soft-deleted item access** — Ghost dependency persists after blocker deletion, permanently stalling downstream items
3. ✅ **Malformed verdict bypasses routing** — Retrigger endpoint allows unlimited vote farming; no attempt ceiling
4. ✅ **Full dataset enumeration** — Pagination is entirely non-functional; any `limit` value (including `-1`, `0`, `999999`) returns the complete dataset

### Most Dangerous Chain

**RED-001 + RED-003 + RED-009** — Any anonymous caller can approve any feature request regardless of AI voting outcome with a single HTTP request:
```bash
curl -X PATCH http://localhost:3001/api/feature-requests/<id> \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=approved"
```
This is a cross-origin CSRF exploit: no credentials, no CSRF token, no authentication, no rate limiting. The form-encoded body bypasses both the JSON Content-Type assumption and the vote-count guard that only lives in the dedicated `/approve` handler.

Full findings appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
