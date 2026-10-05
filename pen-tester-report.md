Dashboard reporting isn't available without an active run ID (expected in standalone invocation). The artifact and learnings are written. Here is the full summary of the analysis:

---

## Attack Surface Map — Pen Tester Report

**12 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md`.

### Finding Summary

| ID | Title | Severity |
|----|-------|----------|
| PEN-001 | **Complete absence of authentication and authorization — all endpoints** | 🔴 Critical |
| PEN-002 | **Intake webhook endpoints — no HMAC signature or token verification** | 🔴 Critical |
| PEN-003 | **State machine bypass via unauthenticated `overrideRoute` parameter** | 🟠 High |
| PEN-004 | **Unbounded pagination limit — full work item store enumeration** | 🟠 High |
| PEN-005 | **Dashboard endpoints — unauthenticated full system state exposure** | 🟠 High |
| PEN-006 | **`NeedsClarification` assessment verdict silently mapped to `Rejected`** | 🟡 Medium |
| PEN-007 | **No security HTTP headers — clickjacking, MIME sniffing, info disclosure** | 🟡 Medium |
| PEN-008 | **Prometheus `/metrics` endpoint — unauthenticated operational intel** | 🟡 Medium |
| PEN-009 | **Computational DoS via unbounded `blockedBy` array in PATCH** | 🟡 Medium |
| PEN-010 | **Soft-deleted item IDs enumerable via dependency links** | 🟢 Low |
| PEN-011 | **Missing `/api/search` endpoint — 404 + future ReDoS risk** | 🟢 Low |

### Key Attack Chains for Red Teamer

1. **Bypass full assessment pipeline** → `POST /route {"overrideRoute":"fast-track"}` → item goes `Backlog → Approved` in one call, skipping the entire pod review
2. **Full store dump** → `GET /api/dashboard/queue` to collect all UUIDs, then `GET /api/work-items?limit=999999` for full content
3. **Spoof Zendesk webhooks** → `POST /api/intake/zendesk` with arbitrary `type`/`priority` values, no secret required
4. **Approve/dispatch any item** → zero credentials needed, call approve then dispatch on any known UUID
