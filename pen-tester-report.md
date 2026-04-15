The Attack Surface Map has been written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the summary of what was found:

---

## Attack Surface Map — Summary

**14 findings total: 3 Critical · 5 High · 4 Medium · 2 Low**

### Critical
| ID | Finding |
|----|---------|
| **PEN-001** | **Zero authentication on every API endpoint** — the entire application is publicly accessible with no auth middleware installed. All other findings are preconditioned on this. |
| **PEN-002** | **Fast-track override bypasses the entire assessment pod** — `POST /api/work-items/:id/route` accepts `{"overrideRoute":"fast-track"}` from any caller, collapsing `backlog → approved` in one call. Directly achieves the red-team state-machine bypass objective. |
| **PEN-003** | **Manual approve bypasses assessment pod** — `POST /api/work-items/:id/approve` works on any item in `proposed`/`reviewing` with no credentials or privilege check. |

### High
| ID | Finding |
|----|---------|
| **PEN-004** | Intake webhooks (`/zendesk`, `/automated`) have **no HMAC/signature verification** — anyone can inject items impersonating Zendesk |
| **PEN-005** | Intake endpoints accept **arbitrary strings for `type`/`priority`** — enum validation present on main endpoint is absent on intake routes |
| **PEN-006** | **Unbounded `?limit=` parameter** on list endpoints — `?limit=999999` returns the full dataset. Achieves the enumeration objective. |
| **PEN-007** | **Soft-deleted blocker permanently traps dependents** — `computeHasUnresolvedBlockers` treats a deleted blocker as "unresolved", blocking dispatch forever |

### Medium & Low
- No input length validation (DoS via oversized payloads)
- `GET /metrics` unauthenticated (operational intelligence leak)
- NaN injection via non-numeric pagination parameters
- Assessment records accumulate unboundedly on repeated assess calls
- No `/complete` or `/fail` endpoints — `InProgress` items are permanently stuck
