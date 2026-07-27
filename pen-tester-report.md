The dashboard update is expected to fail in standalone mode (no active pipeline run). The analysis is complete. Here's a summary of what was found:

---

## Attack Surface Map — Complete

**14 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md`.

### Critical (3)

| ID | Finding |
|----|---------|
| **PEN-001** | **Zero authentication on every API endpoint** — no middleware, no tokens, no sessions. Every destructive operation is anonymous. |
| **PEN-002** | **Intake webhooks accept unvalidated enum fields with no HMAC** — `type` and `priority` bypass the validation guards present on the main POST route, creating items with arbitrary strings that propagate to Prometheus metric labels (cardinality bomb). |
| **PEN-003** | **`overrideRoute: "fast-track"` skips the entire assessment pod** — any caller can POST `/route` with this body field to jump an item directly to `Approved`, fully satisfying the config's primary pentest objective. |

### High (4)

| ID | Finding |
|----|---------|
| **PEN-004** | **IDOR on all work-item endpoints** — UUIDs are enumerable via list endpoints; no ownership or tenant boundary on any action. |
| **PEN-005** | **Unbounded `limit` parameter** — `GET /work-items?limit=999999` returns entire store; `/dashboard/activity` is O(items × history) in memory before slicing. |
| **PEN-006** | **Manual `/approve` bypasses assessment from `routing` or `proposed` status** — an alternate no-assessment path, distinct from the fast-track override. |
| **PEN-007** | **Soft-deleted blocker permanently blocks dependent dispatch** — `computeHasUnresolvedBlockers` treats `findById → undefined` (deleted item) as "unresolved," creating an inescapable blocked state. |

### Medium (5) / Low (2)

Error message leakage, re-assess idempotency flaw, Prometheus `/metrics` unauthenticated, missing input length validation, frontend-only circular dependency guard, sequential docId enumeration, and unsandboxed debug iframe.
