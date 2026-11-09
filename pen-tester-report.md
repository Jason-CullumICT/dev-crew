## Attack Surface Map Complete

Written to `Teams/TheGuardians/artifacts/attack-surface-map.md` — 11 findings across the full OWASP scope. Here's the executive summary:

---

### Findings Summary

| ID | Severity | Title |
|---|---|---|
| **PEN-001** | 🔴 Critical | **No Authentication on Any API Endpoint** — entire API is open to anonymous access |
| **PEN-002** | 🟠 High | **State Machine Bypass via Fast-Track Override** — `{"overrideRoute":"fast-track"}` skips the entire assessment pod in one request |
| **PEN-003** | 🟠 High | **Intake Webhooks — No HMAC + Enum Field Injection** — `/api/intake/zendesk` accepts arbitrary `type`/`priority` strings |
| **PEN-004** | 🟠 High | **Reject Triggers Unintended Auto-Dispatch Cascade** — rejecting a blocker item auto-dispatches all its approved dependents |
| **PEN-005** | 🟠 High | **Approve Reachable from `routing` Transient Status** — `VALID_STATUS_TRANSITIONS` allows `routing → approved` via the external approve endpoint |
| **PEN-006** | 🟡 Medium | **No Pagination Upper-Bound** — `?limit=999999` accepted; dashboard queue has no pagination at all |
| **PEN-007** | 🟡 Medium | **Soft-Deleted Blocker Permanently Locks Dependent Dispatch** — stale dependency links never cleaned, `findById→undefined` treated as unresolved |
| **PEN-008** | 🟡 Medium | **`NeedsClarification` Silently Collapses to `Rejected`** — assessment logic binary branch discards the third verdict |
| **PEN-009** | 🟡 Medium | **Repeated Assessment Calls Accumulate Unbounded Pod Records** |
| **PEN-010** | 🔵 Low | **Prometheus Metrics Exposed Without Auth** |
| **PEN-011** | 🔵 Low | **Sequential `docId` Enables Enumeration** |

### Key Attack Chain (3 HTTP requests, no credentials)
1. `POST /api/intake/automated` → inject item with invalid enum fields
2. `POST /api/work-items/{id}/route {"overrideRoute":"fast-track"}` → bypass assessment, jump to `Approved`
3. `POST /api/work-items/{id}/dispatch {"team":"TheATeam"}` → dispatch to production

All four red-team objectives from `security.config.yml` are mapped to specific findings.
