## Attack Surface Map Complete

Wrote `Teams/TheGuardians/artifacts/attack-surface-map.md` with **11 findings** (2 Critical, 4 High, 4 Medium, 1 Low).

---

### Critical Findings

| ID | Title |
|---|---|
| **PEN-001** | Complete absence of authentication on **all** endpoints — zero auth middleware in `app.ts` |
| **PEN-002** | Unauthenticated fast-track override — `overrideRoute: "fast-track"` bypasses the entire assessment pod |

### High Findings

| ID | Title |
|---|---|
| **PEN-003** | Unbounded pagination — `?limit=999999` dumps all work items (red-team objective: enumeration) |
| **PEN-004** | Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) skip enum validation on `type`/`priority` |
| **PEN-005** | Manual approve on `routing` status bypasses route classification and assessment |
| **PEN-006** | Rejecting a blocker triggers cascade auto-dispatch of dependent items (business logic flaw) |

### Medium Findings

| ID | Title |
|---|---|
| **PEN-007** | Soft-deleting a blocker item permanently blocks dispatch of its dependents (DoS on work item) |
| **PEN-008** | NaN/zero `page`/`limit` params cause silent data-masking or `Infinity` in `totalPages` |
| **PEN-009** | `NeedsClarification` assessment verdict silently collapses to `Rejected` with no recycle path |
| **PEN-010** | Prometheus `/metrics` endpoint exposed unauthenticated — leaks throughput and team names |

### Low Finding

| ID | Title |
|---|---|
| **PEN-011** | No max-length enforcement on `title`/`description` — unbounded memory growth |

### Key Attack Chains for Red Teamer

- **Full workflow takeover:** PEN-001 + PEN-002 (create → fast-track → approve → dispatch, all unauthenticated)
- **Full enumeration:** PEN-001 + PEN-003 (`?limit=999999` returns everything)
- **Cascade dispatch abuse:** PEN-001 + PEN-006 (reject blocker → force-dispatch dependents)
- **Permanent item DoS:** PEN-007 (add dep → delete blocker → item stuck forever)
