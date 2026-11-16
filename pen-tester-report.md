## Attack Surface Map Complete

**Artifact written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`

---

### Summary of Findings (12 total)

| ID | Severity | Title |
|---|---|---|
| **PEN-001** | 🔴 Critical | **Zero authentication/authorization on all endpoints** |
| **PEN-002** | 🟠 High | Unlimited pagination `limit` → full enumeration in one request |
| **PEN-003** | 🟠 High | State machine bypass via unauthenticated `overrideRoute=fast-track` |
| **PEN-004** | 🟠 High | Unauthenticated manual approve endpoint bypasses assessment pod |
| **PEN-005** | 🟠 High | Intake webhooks: no auth, no enum validation on `type`/`priority` |
| **PEN-006** | 🟠 High | Cascade auto-dispatch chain via dependency manipulation + rejection |
| **PEN-007** | 🟡 Medium | Soft-deleted blocker permanently blocks dependent (business logic DoS) |
| **PEN-008** | 🟡 Medium | NaN/negative pagination parameters → unexpected data slices |
| **PEN-009** | 🟡 Medium | Unauthenticated `/metrics` leaks operational intelligence |
| **PEN-010** | 🟡 Medium | Arbitrary `overrideRoute` string stored verbatim (data integrity violation) |
| **PEN-011** | 🔵 Low | Duplicate change history entries when assessing `reviewing`-status items |
| **PEN-012** | 🔵 Low | Sequential `docId` counter leaks total item volume and deletion count |

---

### Key Red-Team Chains (prioritised)

- **CHAIN-A** (fastest full bypass): `POST /route?overrideRoute=fast-track` → `POST /dispatch` — skips the entire assessment pod in 2 requests.
- **CHAIN-B** (manual approve path): Create → Route → `POST /approve` → `POST /dispatch`.
- **CHAIN-C** (cascade abuse): Create A+B → Approve B → Link B→A → Reject A → B auto-dispatches.
- **CHAIN-D** (enumeration): `GET /api/work-items?limit=999999`.
- **CHAIN-E** (DoS): Add blocker → Approve dependent → Delete blocker → dependent permanently stuck.

The root cause for all High/Critical findings is **PEN-001** (no auth layer). Fixing that single architectural gap would neutralize chains A through F. All other findings are independent of authentication and warrant separate remediation.
