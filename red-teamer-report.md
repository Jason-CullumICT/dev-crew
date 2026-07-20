## Red Team Results — Summary

**5 confirmed live breaches** against `http://localhost:3001` (ephemeral Docker environment). 3 of 4 config objectives achieved.

---

### CONFIRMED BREACHES

| ID | Severity | Objective | Status |
|----|----------|-----------|--------|
| **RED-001** | **Critical** | Bypass state machine — full pipeline traversal | ✅ CONFIRMED |
| **RED-002** | **High** | Dependency deadlock via soft-delete | ✅ CONFIRMED |
| **RED-003** | **High** | Stored XSS across all free-text input vectors | ✅ CONFIRMED |
| **RED-004** | **Medium** | Full data enumeration — pagination not enforced | ✅ CONFIRMED |
| **RED-005** | **Medium** | Prometheus metrics publicly accessible | ✅ CONFIRMED |
| **RED-006** | **High** | Cascade auto-dispatch bypasses approval voting | ✅ CONFIRMED |

---

### RED-001 — CRITICAL BREACH
**`POST /api/feature-requests/:id/force-approve`** — no authentication, no vote majority required. An anonymous attacker can:
1. Create a feature request
2. PATCH it directly to `voting` status (zero votes)  
3. Call `/force-approve` — item becomes `approved` immediately, `human_approval_approved_at` stamped, **zero AI votes cast**
4. Advance to `in_development → completed`

**Full pipeline traversal from `potential → completed` in 4 unauthenticated HTTP calls.**

---

### RED-002 — HIGH
Deleting a blocker item permanently deadlocks all dependent items in `pending_dependencies`. The dependency table retains stale links; the readiness check treats the missing item as `status: "unknown"` → `has_unresolved_blockers: true`. No remediation path exists without direct DB access.

---

### RED-003 — HIGH
HTML/script payloads in `title` and `description` fields are stored verbatim and returned in list, detail, and search API responses. Confirmed on both `/api/feature-requests` and `/api/bugs`.

---

### RED-006 — HIGH
`onItemCompleted` in the dependency service issues a raw `UPDATE ... SET status='approved'` when a blocker resolves, bypassing the entire service-layer approval flow. A feature request can reach `approved` status with **zero votes and no human approval timestamp** via this cascade path.

---

### Dead Ends (skip on re-runs)
SQL injection (parameterized queries block all attempts), mass assignment (service layer ignores injected fields), state skip via PATCH (transition table enforced), deny-after-approve (correctly blocked), concurrent vote racing (first call wins, subsequent fail).
