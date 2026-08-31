Pipeline dashboard has no active run (no `RUN_ID` set), so the update is expected to fail. All artifacts are written. Here's the full summary:

---

## Attack Surface Map Complete

**Artifact:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Findings: 12 total

| ID | Severity | Title |
|----|----------|-------|
| PEN-001 | **Critical** | Zero authentication on entire API |
| PEN-002 | **Critical** | Unvalidated enum values stored via intake webhooks |
| PEN-003 | **High** | `overrideRoute: fast-track` bypasses assessment pod, directly approves items |
| PEN-004 | **High** | No pagination upper bound — full dataset enumeration via `limit=999999` |
| PEN-005 | **High** | `PATCH blockedBy` strips dependency blockers with no status guard — bypasses dispatch gating |
| PEN-006 | **High** | Rejection cascade auto-dispatches dependents — attacker-triggered unintended dispatch |
| PEN-007 | **High** | Intake webhooks have no HMAC/signature verification — spoofed Zendesk events |
| PEN-008 | **Medium** | `/metrics` Prometheus endpoint unauthenticated — operational intelligence leak |
| PEN-009 | **Medium** | No rate limiting on any endpoint |
| PEN-010 | **Medium** | Non-numeric `page`/`limit` params silently return empty 200 response |
| PEN-011 | **Low** | Soft-deleted item docIds leak via `blockedBy` readiness checks |
| PEN-012 | **Low** | Dependency error messages reveal item existence for ID enumeration |

### Full Attack Chain
The map includes a combined chain that achieves all four red-team objectives anonymously: bypass the state machine, bypass dispatch gating, enumerate without pagination limits, and access soft-deleted item identifiers — all without credentials, because there are none (PEN-001).
