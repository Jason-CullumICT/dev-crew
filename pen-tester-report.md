The Attack Surface Map has been written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the summary of what was found:

---

## Attack Surface Map — Complete

**16 findings** across the entire backend API, organized into 4 exploit chains for the red-teamer.

### Critical (2)
| ID | Finding |
|----|---------|
| **PEN-001** | **Zero authentication** — every endpoint (`/api/work-items`, `/api/intake/*`, `/api/dashboard/*`) is open to any unauthenticated HTTP caller |
| **PEN-002** | **Zero authorization/RBAC** — no role differentiation; approve, reject, dispatch, and delete are all equally accessible |

### High (6)
| ID | Finding |
|----|---------|
| **PEN-003** | `?limit=999999` dumps all work items — no maximum enforced in `findAll()` |
| **PEN-004** | `POST /route {"overrideRoute":"fast-track"}` — any item of any type skips assessment pod, lands directly in `approved` |
| **PEN-005** | `POST /approve` with no auth — manually approves items in `proposed`/`reviewing`, bypassing assessment pod entirely |
| **PEN-006** | Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) — no HMAC signature verification; enum values unvalidated |
| **PEN-007** | **Cascade logic flaw** — `DISPATCH_TRIGGER_STATUSES` includes `Rejected`, so *rejecting* a blocker auto-dispatches all dependents to `in-progress` |
| **PEN-008** | **Soft-delete DoS on dependency graph** — deleting a blocker makes `computeHasUnresolvedBlockers()` return `true` forever (soft-deleted item treated as unresolved) |

### Medium (4) / Low (4)
Negative page numbers (`slice(-N)`), no rate limiting, no CORS/CSRF, predictable sequential docIds, unauthenticated Prometheus metrics, unimplemented search endpoint.

### Priority Exploit Chains for Red Team
- **Chain A** (3 requests): Create → route with `overrideRoute:fast-track` → dispatch — full workflow bypass with zero reviews
- **Chain B**: Flood intake webhook + dump all via `?limit=999999` — satisfies "enumerate all work items" objective  
- **Chain C**: Add dependency → soft-delete blocker → dependent permanently stuck — satisfies "soft-deleted item" objective  
- **Chain D**: Set up A→B dependency → reject A → B auto-dispatched — satisfies "bypass state machine" objective
