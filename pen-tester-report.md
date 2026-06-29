The Attack Surface Map has been written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the full findings summary:

---

## Attack Surface Map — Summary

**15 findings total across the entire codebase.** The application has an extremely wide attack surface due to a single root cause: **zero authentication middleware anywhere in the Express app.**

### Critical (4)

| ID | Title |
|----|-------|
| **PEN-001** | Complete Absence of Authentication — every single endpoint is public |
| **PEN-002** | State Machine Bypass via Fast-Track Override — `POST /:id/route {"overrideRoute":"fast-track"}` skips the entire assessment pod and immediately sets status to `approved` |
| **PEN-003** | Manual Approve Bypasses Assessment Pod — `POST /:id/approve` with empty body `{}` works from any allowed status; `reason` is optional |
| **PEN-004** | Intake Webhooks Accept Unauthenticated Arbitrary Input — no HMAC/signature check, plus `type`/`priority` enum fields not validated (unlike the main create endpoint) |

### High (4)

| ID | Title |
|----|-------|
| **PEN-005** | No Pagination Limit — `?limit=999999` returns entire dataset in one request |
| **PEN-006** | Enum Injection on Intake Endpoints — `body.type` stored verbatim, corrupts routing/assessment |
| **PEN-007** | Unauthenticated `/metrics` — leaks operational counters, heap stats, dispatch patterns |
| **PEN-008** | changeHistory Mutated Before Status Confirmed — live store reference mutated before `updateWorkItem()` succeeds; race with DELETE corrupts audit trail |

### Medium (4) — Information disclosure, rate limiting, CSRF, integer edge cases

### Low (3) — Sequential docIDs, NeedsClarification→Rejected logic flaw, dashboard data exposure

### End-to-End Exploit Chains for the Red Teamer
- **Chain A (2 requests):** Create → `POST /route {"overrideRoute":"fast-track"}` → item is `approved` with zero assessment. Then dispatch.
- **Chain B:** Create → route → `POST /approve {}` → dispatch — all unauthenticated.
- **Chain C:** Soft-deleted blocker permanently freezes a dependent item (`computeHasUnresolvedBlockers` treats `findById() = undefined` as unresolved).
