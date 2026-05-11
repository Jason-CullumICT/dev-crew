Dashboard isn't tracking a run with this ID (likely no active pipeline run), but that's a no-op — the artifact is written. Here's the full summary:

---

## Attack Surface Map — Complete

**Artifact written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Finding Summary

| ID | Title | Severity |
|----|-------|----------|
| PEN-001 | Complete absence of authentication on all endpoints | **Critical** |
| PEN-002 | Complete absence of authorization / RBAC | **Critical** |
| PEN-003 | `overrideRoute: fast-track` bypasses entire assessment pipeline | **Critical** |
| PEN-004 | No pagination upper bound — full dataset enumeration | **High** |
| PEN-005 | Intake webhooks accept arbitrary POSTs, no signature validation | **High** |
| PEN-006 | Unvalidated enum fields in intake endpoints (type/priority injection) | **High** |
| PEN-007 | Unauthorized cascade auto-dispatch via dependency injection | **High** |
| PEN-008 | Dashboard queue dumps all work items without pagination/auth | **Medium** |
| PEN-009 | Soft-deleted item UUID disclosure via readiness check | **Medium** |
| PEN-010 | Dashboard activity exposes full change history without auth | **Medium** |
| PEN-011 | Unprotected Prometheus `/metrics` endpoint | **Medium** |
| PEN-012 | `NeedsClarification` verdict silently treated as rejection | **Medium** |
| PEN-013 | Predictable sequential document IDs | **Low** |
| PEN-014 | Raw exception messages returned in some error responses | **Low** |

### All 5 red-team objectives are achievable

The map includes ready-to-execute attack chains for the red-teamer, including a 3-request full workflow takeover, a 2-request complete data exfiltration, and a 6-request cascade dispatch of a victim item — all unauthenticated.
