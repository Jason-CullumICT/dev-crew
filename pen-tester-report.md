Dashboard reporting needs an existing run ID from the pipeline orchestrator — that's expected when running standalone. The critical deliverable is complete.

---

## Attack Surface Map — Complete

**File written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Summary: 15 Findings Across 4 Severity Levels

| ID | Title | Severity | OWASP |
|---|---|---|---|
| PEN-001 | **No authentication on any endpoint** | 🔴 Critical | A07 |
| PEN-002 | **State machine bypass via fast-track override** | 🔴 Critical | A01 |
| PEN-003 | Soft-deleted blocker permanently gates dispatch + ID exposure | 🟠 High | A01 |
| PEN-004 | Intake webhooks — no auth + unvalidated enum injection | 🟠 High | A07/A08 |
| PEN-005 | Unlimited `limit` parameter — full dataset enumeration | 🟠 High | A01 |
| PEN-006 | Raw `Error.message` returned in 500 responses | 🟠 High | A07 |
| PEN-007 | Re-assessment race condition on `reviewing` status | 🟠 High | A08 |
| PEN-008 | Malformed `overrideRoute` value stored as invalid enum | 🟠 High | A08 |
| PEN-009 | Unauthenticated Prometheus `/metrics` endpoint | 🟡 Medium | A01 |
| PEN-010 | No CORS policy — any origin accepted | 🟡 Medium | A01 |
| PEN-011 | Dashboard endpoints expose full dataset unauthenticated | 🟡 Medium | A01 |
| PEN-012 | No `blockedBy` size limit — DoS via quadratic cycle detection | 🟡 Medium | A08 |
| PEN-013 | Reject cascade auto-dispatches without authorization | 🟡 Medium | A01 |
| PEN-014 | NaN/zero `limit` and `page` cause undefined pagination behavior | 🔵 Low | — |
| PEN-015 | Sequential `docId` enables item count enumeration | 🔵 Low | A01 |

### Key Red Team Handoffs

The **four red team objectives** from `security.config.yml` all have confirmed exploit paths:

1. **Bypass state machine** → `POST /:id/route {"overrideRoute":"fast-track"}` (PEN-002)
2. **Access soft-deleted item** → Delete a blocker; its ID persists in dependent's `blockedBy[]` (PEN-003)
3. **Malformed assessment verdict** → `POST /:id/route {"overrideRoute":"INVALID_STRING"}` (PEN-008)
4. **Enumerate all items** → `GET /api/work-items?limit=9999999` (PEN-005)
