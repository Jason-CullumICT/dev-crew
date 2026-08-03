Dashboard isn't active (no live pipeline run ID), but that's expected for a standalone invocation. The artifact and learnings are both written.

---

## Attack Surface Map — Complete

**15 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the executive summary:

### Critical (2)
| ID | Finding |
|---|---|
| PEN-001 | **Zero authentication on all endpoints** — every API is fully unauthenticated |
| PEN-002 | **`POST /:id/approve` bypasses the entire assessment pod** — any caller can manually approve any item in `proposed`/`reviewing` |

### High (5)
| ID | Finding |
|---|---|
| PEN-003 | **No pagination cap** — `?limit=999999999` dumps all work items in one request |
| PEN-004 | **Intake endpoints skip enum validation** — `type`/`priority` accept arbitrary strings including `"__proto__"` |
| PEN-005 | **`overrideRoute` not validated against enum** — any string stored as route field; `"fast-track"` bypasses assessment |
| PEN-006 | **No CORS policy** — any origin accepted, CSRF-ready when auth is added |
| PEN-007 | **Webhook intake has no HMAC signature check** — anyone can flood `/api/intake/zendesk` |

### Medium (5)
| ID | Finding |
|---|---|
| PEN-008 | Unauthenticated `/metrics` endpoint leaks operational counters |
| PEN-009 | **Stored XSS** — `body.reason` in reject/approve stored verbatim, returned in dashboard activity |
| PEN-010 | No body size limits + unbounded `changeHistory` → memory exhaustion |
| PEN-011 | **Soft-deleting a blocker permanently gates dependent items** (cascade-dispatch never fires on soft-delete) |
| PEN-012 | Sequential `WI-NNN` docIds enable full enumeration |

### Low (3)
PEN-013 (repeated assess inflates records), PEN-014 (latent `Object.assign` risk in store), PEN-015 (missing `/api/search` endpoint).

### Notable discrepancy
`security.config.yml` lists `/api/work-items/:id/transition` and `/:id/assessment` as critical entry points — **neither exists**. Actual workflow endpoints are `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`.
