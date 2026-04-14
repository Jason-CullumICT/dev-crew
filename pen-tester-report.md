The dashboard reporting requires a pre-registered run ID (set by the team leader), so those commands are no-ops in this standalone invocation. All artifacts have been written. Here's a summary of what was found:

---

## Attack Surface Map — Complete

**Written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Finding Totals

| Severity | Count | Key Findings |
|----------|-------|--------------|
| **Critical** | 3 | No auth anywhere, no RBAC on workflow actions, fast-track override bypass |
| **High** | 5 | Unauthenticated intake webhooks, unbounded pagination dump, non-atomic dependency stripping, soft-deleted blocker DoS, full dashboard data exposure |
| **Medium** | 4 | Missing `/api/search` route, negative-limit pagination, cascade dispatch via rejection, memory exhaustion DoS |
| **Low** | 2 | Unauthenticated `/metrics`, unsandboxed debug portal iframe |

---

### Most Critical Findings (for Red Team Priority)

1. **PEN-001/002 (Critical):** Zero authentication — every endpoint is fully open to any unauthenticated caller.

2. **PEN-003 (Critical):** Fast-track override — `POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` jumps any `backlog` item directly to `approved`, bypassing the entire 4-role assessment pod. Full lifecycle compromise in **2 requests**.

3. **PEN-006 (High):** Non-atomic `setDependencies` — a deliberate partial-failure attack on `PATCH /api/work-items/:id {"blockedBy":["valid","nonexistent"]}` strips existing blockers while returning a 400 error, unlocking dispatch-blocked items.

4. **PEN-007 (High):** Permanent dispatch DoS — soft-deleting a blocker item causes `computeHasUnresolvedBlockers` to treat it as unresolved forever, with no recovery path.

5. **PEN-005 (High):** `?limit=999999` dumps the entire in-memory store in one request — maps directly to the security.config objective.
