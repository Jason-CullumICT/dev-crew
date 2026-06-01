---

## Red Team Results Summary

**Environment:** Ephemeral (`docker-compose.test.yml`) — destroyed after testing  
**Target:** `portal/Backend/` on `localhost:3001`  
**Chains Attempted:** 9  
**Confirmed Breaches:** 7  
**Objectives Achieved:** 4 / 4 ✅

---

### ⚠️ Critical Process Finding First

**The pen-tester analyzed the wrong application.** The attack surface map covers `Source/Backend/` (work-items, `/api/intake`, `/api/work-items/:id/transition`), but `docker-compose.test.yml` runs `portal/Backend/` (feature-requests, bugs, cycles, pipeline-runs). Every PEN-ID finding references routes that return **HTTP 404** in the live environment. The red-teamer pivoted to the live target and conducted fresh exploitation.

---

### Confirmed Breaches

| ID | Finding | Severity | Objective |
|----|---------|----------|-----------|
| **RED-001** | Zero authentication on all 8 API route families | **Critical** | All objectives |
| **RED-002** | `/force-approve` bypasses AI voting majority (4/5 denies overridden, no auth) | **Critical** | State machine bypass ✅ |
| **RED-003** | Team dispatch injection with attacker-controlled `actions_url`/`workflow`/`repo` | **Critical** | Malformed verdict bypass ✅ |
| **RED-004** | No pagination limit — all items enumerated unconditionally (`?limit=1` ignored) | **Medium** | Enumerate all items ✅ |
| **RED-005** | IDOR — unauthenticated PATCH/DELETE any resource regardless of ownership | **High** | Modify soft-deleted items ✅ |
| **RED-006** | Stored XSS — `<script>` in title/description stored and returned verbatim | **High** | New finding |
| **RED-007** | Prometheus `/metrics` exposes full route map including hidden `/:id/force-approve` | **Low** | Recon enabler |
| **RED-008** | `/api/pipeline-runs` exposes all agent identities without auth | **Medium** | New finding |
| **RED-009** | **4-step full pipeline takeover** chain: Create → Vote → Force-Approve → Inject Dispatch (zero credentials throughout) | **Critical** | Composite |

### Dead Ends
- **SQL Injection via `/api/search`**: In-memory filtering only — no SQL interpolation
- **Vote stuffing**: State machine prevents double-voting
- **SSRF via `actions_url`**: Stored but not auto-fetched (deferred risk)

### Architectural Fix Required
The root cause is a single missing line: **no authentication middleware** mounted in `portal/Backend/src/index.ts`. All other findings are amplified by this. Fix sequence: (1) Add JWT/session auth middleware; (2) Add RBAC for `force-approve` and dispatch creation; (3) Validate `actions_url` against GitHub allowlist; (4) Add pagination caps; (5) Sanitize HTML in text fields.
