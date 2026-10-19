## Attack Surface Map Complete

The white-box static analysis is done. Here's what was found and packaged for the red-teamer:

---

### Findings Summary (10 total)

| ID | Severity | Title |
|---|---|---|
| PEN-001 | **Critical** | Zero authentication on every API endpoint |
| PEN-002 | **High** | Assessment pod bypass via `/approve` manual override |
| PEN-003 | **High** | Fast-track route override skips assessment for any item |
| PEN-004 | **High** | Intake webhooks unauthenticated + no enum validation on `type`/`priority` |
| PEN-005 | **High** | No pagination limit cap — full item enumeration in one request |
| PEN-006 | **High** | Soft-deleting a blocker permanently blocks all its dependents (DoS) |
| PEN-007 | **Medium** | Rejecting an item silently cascade-dispatches its dependents |
| PEN-008 | **Medium** | `/metrics` endpoint unauthenticated — leaks operational internals |
| PEN-009 | **Low** | NaN injection in pagination returns empty data with non-zero total |
| PEN-010 | **Low** | Unvalidated `overrideRoute` stores arbitrary string in `route` field |

### Key Red Team Attack Chain
Three unauthenticated requests create and dispatch any item while bypassing all assessment:
1. `POST /api/work-items` → create
2. `POST /api/work-items/:id/route` `{"overrideRoute":"fast-track"}` → jump to `approved`
3. `POST /api/work-items/:id/dispatch` → `in-progress`, zero assessment pod invocations

**Artifact written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`
