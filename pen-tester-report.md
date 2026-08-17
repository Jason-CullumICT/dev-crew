---

## Attack Surface Map Complete

**12 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md`.

### Severity Breakdown

| # | ID | Severity | Title |
|---|---|---|---|
| 1 | PEN-001 | **Critical** | Complete absence of authentication and authorization |
| 2 | PEN-002 | **High** | Pagination limit not enforced — full dataset enumeration |
| 3 | PEN-003 | **High** | State machine bypass via fast-track route override |
| 4 | PEN-004 | **High** | Intake webhooks accept unvalidated enum fields |
| 5 | PEN-005 | **High** | Soft-deleted blocker causes permanent dispatch block (DoS) |
| 6 | PEN-006 | **High** | Cascade dispatch abuse via blocker rejection |
| 7 | PEN-007 | Medium | `NeedsClarification` verdict silently maps to `Rejected` status |
| 8 | PEN-008 | Medium | Unauthenticated Prometheus `/metrics` endpoint |
| 9 | PEN-009 | Medium | No request body size limits — memory exhaustion DoS |
| 10 | PEN-010 | Low | Missing `/api/search` route referenced in frontend client |
| 11 | PEN-011 | Low | No CORS policy configured |
| 12 | PEN-012 | Low | No rate limiting on any endpoint |

### Key Structural Issues

- **PEN-001 is the root cause** — the app has no auth middleware anywhere in `app.ts`. Every other finding is amplified by this.
- **PEN-003** directly satisfies the red-team objective *"Bypass work item state machine"* — any item can be routed to `Approved` via `{"overrideRoute": "fast-track"}` in one request.
- **PEN-005** is a novel DoS unique to this codebase: soft-deleting a blocker item does not cascade to remove its dependency links, permanently freezing all dependent `Approved` items.
- **Four compound attack chains** are documented for the red-teamer including a full unauthorized approval chain, bulk data exfiltration, targeted freeze, and cascade dispatch abuse.
