The Attack Surface Map is written. Here's what was found:

---

## Attack Surface Map — Complete

**12 findings across 2 Critical · 4 High · 4 Medium · 2 Low**

### 🔴 Critical (2)

**PEN-001 — Zero Authentication / Authorization**  
The Express app (`app.ts`) has absolutely no auth middleware. Every one of the 18 endpoints — including approve, reject, dispatch, and delete — is callable by any anonymous HTTP client. No JWT, no session, no API key, no RBAC anywhere in the codebase.

**PEN-002 — Intake Webhooks: No Signature Verification + Enum Injection**  
`POST /api/intake/zendesk` and `/api/intake/automated` accept payloads from any caller with no HMAC signature check. Additionally, `type` and `priority` fields are passed through without enum validation, allowing invalid strings to be stored and corrupt Prometheus label cardinality.

### 🟠 High (4)

**PEN-003 — State Machine Bypass via `overrideRoute`**  
`POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` skips the entire 4-role assessment pod and lands the item directly in `approved` status — no privilege required. Directly achieves red-team objective #1.

**PEN-004 — Unlimited Pagination = Full Data Enumeration**  
`GET /api/work-items?limit=999999` returns all items in one response. No cap enforced. Directly achieves red-team objective #4.

**PEN-006 — Unauthenticated IDOR — Delete Any Work Item**  
Any caller with a UUID can `DELETE /api/work-items/:id`. UUIDs are trivially harvested via the unlimited list endpoint.

**PEN-007 — Cascade Auto-Dispatch via Blocker Rejection**  
Rejecting a blocker item triggers auto-dispatch of all its dependent Approved items, bypassing the manual dispatch step. `DISPATCH_TRIGGER_STATUSES` includes `Rejected`.

### 🟡 Medium / 🔵 Low (6)

PEN-005 (NaN pagination injection), PEN-008 (soft-deleted blocker permanently blocks dispatch), PEN-009 (Prometheus `/metrics` exposed), PEN-011 (`NeedsClarification` verdict silently maps to `Rejected`), PEN-010 (missing `/api/search` route — technology disclosure), PEN-012 (no CORS policy).

**Handoff artifact:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`
