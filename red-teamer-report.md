## Red Team Results Summary

Active exploitation against the ephemeral isolated environment at `http://localhost:3001` is complete. Here's what was achieved:

---

### ⚠️ Meta-Finding First: Wrong Service Analysed (RED-007)
The pen tester statically analysed `Source/Backend/` (the workflow engine with `/api/work-items`), but `docker-compose.test.yml` builds from `portal/` — a **different service** with different routes (`/api/feature-requests`, `/api/bugs`, etc.). The workflow engine was never running. All active exploitation was performed against the actual running portal backend.

---

### Confirmed Live Breaches (5 of 7 chains)

| ID | Title | Severity | Objective |
|----|-------|----------|-----------|
| **RED-001** | Anonymous Agent Voting Pipeline Takeover | **Critical** | ✅ Confirmed |
| **RED-002** | State Machine Bypass via Unauthenticated Sequential PATCH | **Critical** | ✅ Achieved (`potential → completed` in 4 requests) |
| **RED-003** | Bug Status Escalation Without Auth | **Critical** | ✅ Full lifecycle (`reported → closed`, 4 PATCH calls) |
| **RED-004** | Unbounded Pagination / Full Data Enumeration | **Medium** | ✅ Achieved (`?limit=999999999` accepted) |
| **RED-005** | SSRF via Unvalidated `actions_url` in Team Dispatches | **High** | Partial (AWS metadata URL `169.254.169.254` stored, callback not triggered in test window) |
| **RED-006** | Malformed Vote Payload Accepted Unconditionally | **Medium** | Partial (pipeline fires on any `vote` value including `INVALID_VERDICT_XYZ`) |

### Security Config Objectives: 3/4 achieved (75%)
- ✅ Bypass state machine → **ACHIEVED** (feature request and bug status freely writable via PATCH)
- ❌ Access soft-deleted item by ID → **NOT ACHIEVED** (hard delete, returns 404)
- ⚠️ Malformed assessment bypass → **PARTIAL** (invalid vote value silently accepted, pipeline fires)
- ✅ Enumerate without pagination cap → **ACHIEVED**

Results written to `Teams/TheGuardians/artifacts/attack-surface-map.md` § Red Team Results and learnings to `Teams/TheGuardians/learnings/red-teamer.md`.
