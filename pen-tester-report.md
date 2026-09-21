## Attack Surface Map Complete

**11 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md` — ready for red-team handoff.

---

### Summary by Severity

| # | ID | Title | Severity |
|---|-----|-------|----------|
| 1 | PEN-001 | **No authentication on any endpoint** | 🔴 Critical |
| 2 | PEN-002 | `overrideRoute=fast-track` skips entire assessment pod | 🟠 High |
| 3 | PEN-003 | Unbounded `limit` enables full dataset enumeration | 🟠 High |
| 4 | PEN-004 | Intake webhooks — no signature verification + invalid enum values accepted | 🟠 High |
| 5 | PEN-005 | Rejection cascades to auto-dispatch dependents (business logic flaw) | 🟠 High |
| 6 | PEN-006 | Soft-deleted blocker permanently blocks dispatch of dependents (DoS) | 🟡 Medium |
| 7 | PEN-007 | `/metrics` publicly accessible — operational intelligence leak | 🟡 Medium |
| 8 | PEN-008 | Race condition in `setDependencies` (non-atomic remove+add) | 🟡 Medium |
| 9 | PEN-009 | `routing→approved` transition enables partial state machine bypass | 🟡 Medium |
| 10 | PEN-010 | Raw internal error messages returned to API clients | 🔵 Low |
| 11 | PEN-011 | No rate limiting — intake flood / unbounded memory growth | 🔵 Low |

### Highest-Priority Attack Chains for Red Team

1. **Full Bypass (3 requests, no auth):** `POST /work-items` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch` — achieves Backlog→InProgress with zero assessment.
2. **State Machine Abuse:** fast-track item B to Approved, add blocker A, reject A → B auto-dispatches via cascade (rejected prerequisite triggers downstream work).
3. **Full Enumeration:** `GET /api/work-items?limit=999999999` — dumps entire dataset in one request.
