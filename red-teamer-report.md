All exploit chains complete. Here is the full Red Team report:

---

## 🔴 Red Team Results — dev-crew Source App

**Run date:** 2026-05-11 | **Environment:** `Source/Backend` (ts-node, localhost:3002, ephemeral in-memory store)

### ⚠️ Environmental Note
`docker-compose.test.yml` builds and runs `portal/Backend` (a different app). The pen-tester's attack surface map targets `Source/Backend` (workflow engine). Both are in-scope for this repo. Source/Backend was started locally on port 3002 to execute the pen-tester's exploit chains.

---

### Objectives Achieved: 4/4 ✅ — Grade: F (Critical Breach)

| Chain | Findings | Severity | Objective | Result |
|---|---|---|---|---|
| RED-001: Full Workflow Takeover | PEN-001+002+003 | **Critical** | State machine bypass | ✅ Confirmed |
| RED-002: Full Data Exfiltration | PEN-001+004+008+010 | **High** | Unlimited enumeration | ✅ Confirmed |
| RED-003: Cascade Dispatch | PEN-007 | **Critical** | Unauthorized dispatch | ✅ Confirmed |
| RED-004: Intake XSS + Enum Injection | PEN-005+006 | **High** | Malformed assessment bypass | ✅ Confirmed |
| RED-005: Soft-Delete UUID Disclosure | PEN-009 | Medium | Soft-deleted item access | ✅ Confirmed |
| RED-006: Assessment Verdict Bypass | PEN-012 | Medium | Dispatch gating bypass | ✅ Confirmed |
| RED-007: Error Message Leakage | PEN-014 | Low | Reconnaissance | Confirmed |
| RED-008: Sequential Doc ID Enumeration | PEN-013 | Low | Full enumeration | ✅ Confirmed |

---

### Top 3 Critical Findings

**RED-001 — Full Workflow Takeover in 3 requests:**
```
POST /api/work-items             → WI-001 created (status: backlog), NO auth header needed
POST /api/work-items/WI-001/route {"overrideRoute":"fast-track"} → status: approved (assessment.length=0)  
POST /api/work-items/WI-001/dispatch {"team":"TheATeam"}         → status: in-progress
```
Assessment pod **never ran**. Any anonymous caller can approve and dispatch any work item.

**RED-003 — Unauthorized Cascade Dispatch:**
Injected a fake blocker onto an `approved` victim item, then rejected it. The `cascade-dispatcher` agent auto-dispatched the victim to `in-progress` without any explicit `/dispatch` call. Confirmed in `changeHistory`: `agent=cascade-dispatcher | reason: Auto-dispatched after blocker WI-006 resolved`.

**RED-004 — Stored XSS via Intake:**
`POST /api/intake/zendesk` with `priority: "<img src=x onerror=alert(document.cookie)>"` and `type: "INVALID_ENUM_TYPE"` — both stored verbatim, retrievable via `GET /api/work-items/WI-007`. No HMAC signature required. Automated intake endpoint also fully impersonatable.

---

### Root Cause
**Zero authentication/authorization.** All critical findings chain from PEN-001 (no auth). A single auth middleware would break Chains 1, 2, 3, and 4. The `overrideRoute` escape hatch (PEN-003) and cascade auto-dispatch (PEN-007) are architectural flaws that remain dangerous even after auth is added unless explicitly addressed.
