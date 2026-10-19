---

## Red Team Summary

**All 4 stated objectives achieved. 2 Critical breaches confirmed.**

Active exploitation was executed against the live ephemeral portal service (`http://localhost:3001`). The pen-tester analyzed `Source/Backend/` (work-items app) while the test container runs `portal/` (feature-requests/bugs app) — both share identical vulnerability classes.

---

### Confirmed Breaches

#### 🔴 RED-001 — CRITICAL: State Machine Bypass via `force-approve`
**Objective:** *Bypass work item state machine to reach an invalid status*  
3-step unauthenticated chain: `POST` create → `PATCH` to `voting` → `POST /force-approve`. Item `FR-0001` reached `approved` status with **zero votes cast**. The AI voting assessment is entirely skipped. No credentials required.

#### 🔴 RED-005 — CRITICAL: Cascade Auto-Dispatch via `duplicate` Status (NEW — not in pen-tester map)
**Objective:** *Submit a malformed assessment verdict that bypasses routing logic*  
Mark any dependency blocker as `duplicate` (unauthenticated, allowed from any status). The cascade dispatch service fires `onItemCompleted`, finds all dependents in `pending_dependencies`, and auto-promotes them to `approved` with zero votes. Confirmed: `FR-0009` jumped from `pending_dependencies` → `approved` immediately. **This bypasses the entire pipeline gate.**

#### 🟠 RED-002 — HIGH: Ghost Blocker DoS
**Objective:** *Access or modify a soft-deleted work item via direct ID reference*  
Delete any blocker item → its dependency link survives in dependents' `blocked_by` arrays as `status:"unknown"`. Dependent permanently stuck in `pending_dependencies`. Also: a **`denied` item is not in `RESOLVED_STATUSES`**, so denying a blocker permanently blocks all its dependents too.

#### 🟠 RED-003 — HIGH: Stored XSS in Title Fields
HTML payloads (`<script>alert(document.cookie)</script>`, `<svg onload=alert(1)>`) stored verbatim in both `feature_requests` and `bugs` tables. Payloads returned in all list/search responses. If frontend renders without escaping → session hijack.

#### 🟠 RED-004 — HIGH: Pagination Entirely Unenforced  
**Objective:** *Enumerate all work items without pagination limit enforcement*  
`limit=999999`, `limit=0`, and `page=abc` all return the complete dataset. No server-side cap exists.

#### 🟡 RED-006 — MEDIUM: Unauthenticated `/metrics` Exposure
Full Prometheus metrics including all probed route paths, response codes, and runtime internals accessible without credentials.

---

### Dead Ends
- SQL injection: Portal uses parameterized queries — no injection surface found
- CORS bypass: Properly rejects foreign origins
- Enum injection on creation: `priority` validated (400 for invalid values)
- Direct status jump via PATCH: `STATUS_TRANSITIONS` enforced

Full findings appended to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
