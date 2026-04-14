The attack surface map is written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's what the analysis found:

---

## Attack Surface Map — Summary

**19 total findings** across 4 Critical, 7 High, 5 Medium, 3 Low.

### Root Cause: Zero Authentication
The application has **no authentication or authorization middleware anywhere** — every endpoint (CRUD, state transitions, dashboard, intake webhooks, Prometheus metrics) is fully open to anonymous callers. This single structural failure is the root vulnerability that amplifies everything else.

### Critical Findings (4)

| ID | Title |
|----|-------|
| PEN-001 | Complete absence of auth on all endpoints |
| PEN-002 | Unauthenticated manual approve bypasses assessment pipeline entirely |
| PEN-003 | `overrideRoute: "fast-track"` skips assessment pod — no auth required |
| PEN-004 | Intake webhooks have no HMAC verification + no enum validation on `type`/`priority` |

### High Findings (7)
- **PEN-005** — No pagination limit cap → `?limit=999999` dumps entire dataset (satisfies config objective)
- **PEN-006** — `GET /metrics` publicly exposes operational intelligence
- **PEN-007** — Rejecting a blocker item auto-dispatches dependents (cascade abuse)
- **PEN-008** — Soft-deleting a blocker creates a permanent ghost dependency, permanently blocking dispatch of dependents
- **PEN-009** — Arbitrary string injected into `route` field via unvalidated `overrideRoute`
- **PEN-010** — No field length limits (memory exhaustion)
- **PEN-011** — Soft-deleted item UUIDs exposed via dependency graph; operations against deleted items succeed

### Attack Chains
Four ready-to-execute chains are documented for the red-teamer, mapped directly to the security config objectives (state machine bypass, soft-delete item access, malformed verdict injection, unlimited enumeration).
