Static analysis complete. Here's what the Attack Surface Map covers:

---

## Attack Surface Map — Summary

**File:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Total findings:** 13 (3 Critical · 5 High · 4 Medium · 1 Low)

---

### 🔴 Critical (3)

| ID | Finding |
|----|---------|
| **PEN-001** | **Zero authentication** — every endpoint (`/api/work-items`, `/api/dashboard`, `/api/intake`, all workflow actions) is completely anonymous. No auth library even installed. |
| **PEN-002** | **Intake webhook injection** — `POST /api/intake/zendesk` and `/automated` have no HMAC signature verification + no enum validation on `type`/`priority` fields (unlike the main CRUD route). Arbitrary work items can be injected with invalid enum values. |
| **PEN-003** | **Fast-track assessment bypass** — `POST /api/work-items/:id/route` accepts `{"overrideRoute":"fast-track"}` with zero permission check. 3-request chain: create → fast-track route → dispatch, skipping the entire assessment pod. |

### 🟠 High (5)

| ID | Finding |
|----|---------|
| **PEN-004** | Unauthenticated approve/reject/dispatch — any caller can manually approve or dispatch any item |
| **PEN-005** | `limit=999999` dumps all work items — no upper bound on pagination; `GET /api/dashboard/queue` has no pagination at all |
| **PEN-006** | **Soft-deleted item → permanent dispatch block** — soft-deleting a blocker makes `computeHasUnresolvedBlockers()` permanently return `true` for dependents |
| **PEN-007** | **Cascade dispatch via rejection** — rejecting a blocker auto-dispatches all `Approved` dependents via `onItemResolved()`, no human action needed |
| **PEN-008** | `GET /metrics` unauthenticated — leaks Node.js version, GC stats, domain counters |

### 🟡 Medium (4) + 🟢 Low (1)

Integer parsing edge cases (NaN/Infinity from bad `page`/`limit`), missing runtime enum validation on `overrideRoute`, missing CORS, and the unimplemented `/api/search` endpoint (pre-emptive scoping). Change history has no real identity attribution (audit trail spoofing).

### Four Pre-Built Exploit Chains

The artifact includes ready-to-run `curl` payloads covering all four red-team objectives from `security.config.yml`:
- Chain A: Full pipeline bypass (backlog → in-progress in 3 requests)  
- Chain B: Full data enumeration in 1 request  
- Chain C: Permanent dispatch sabotage via soft-deleted blocker  
- Chain D: Cascade dispatch abuse via unauthenticated rejection
