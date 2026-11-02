## Attack Surface Map Complete

The white-box static analysis is finished. Here's what I found:

---

### Summary: 13 Findings

| ID | Severity | Finding |
|---|---|---|
| **PEN-001** | 🔴 **Critical** | Complete absence of authentication — all API endpoints are unauthenticated |
| **PEN-002** | 🟠 **High** | Unbounded pagination enables full work-item enumeration (`limit=999999`) |
| **PEN-003** | 🟠 **High** | Intake webhooks have no auth or HMAC signature validation; invalid enum values accepted |
| **PEN-004** | 🟠 **High** | State machine bypass — manual `/approve` skips assessment pod (`proposed → approved`) |
| **PEN-005** | 🟠 **High** | Route override (`overrideRoute: "fast-track"`) fast-tracks any item type with no role check |
| **PEN-006** | 🟠 **High** | Cascade auto-dispatch can be triggered by an unauthenticated rejection |
| **PEN-007** | 🟡 **Medium** | No input length validation on title/description — enables memory exhaustion DoS |
| **PEN-008** | 🟡 **Medium** | `/metrics` publicly exposes Prometheus operational intelligence |
| **PEN-009** | 🟡 **Medium** | No rate limiting on any endpoint |
| **PEN-010** | 🟡 **Medium** | Assessment re-entry allows unbounded assessment record accumulation |
| **PEN-011** | 🟡 **Medium** | Assessment pod is fully deterministic — crafted items guarantee automated approval |
| **PEN-012** | 🔵 **Low** | Dashboard `/activity` leaks full change history (with `oldValue`/`newValue`) without auth |
| **PEN-013** | 🔵 **Low** | No CORS policy defined |

### Key Attack Chains Mapped
- **Chain A** (Data exfiltration): `GET /api/work-items?limit=999999` + activity dump — zero credentials needed
- **Chain B** (State machine compromise): create → `route?overrideRoute=fast-track` → dispatch to any team
- **Chain C** (Integrity injection): POST to `/api/intake/zendesk` with invalid enum `type` values
- **Chain D** (Cascade abuse): set up dependency, reject blocker → auto-dispatches dependents

### Red Team Objectives Coverage
- ✅ Bypass state machine → **PEN-004, PEN-005**
- ✅ Access soft-deleted item → **Not possible** (store correctly blocks this path)
- ✅ Malformed assessment bypass → **PEN-003** (invalid enum via intake)
- ✅ Full enumeration without pagination limits → **PEN-002**

The artifact is written to `Teams/TheGuardians/artifacts/attack-surface-map.md`.
