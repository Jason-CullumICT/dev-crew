The dashboard requires a registered run ID (not available in this standalone invocation). The artifact and learnings have been written. Here is the complete summary of the findings:

---

## Attack Surface Map — Complete

**Output:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

### 11 Findings Across 4 Severity Tiers

| ID | Title | Severity |
|----|-------|----------|
| **PEN-001** | **Entire API Unauthenticated — No Auth/AuthZ Middleware** | 🔴 Critical |
| **PEN-002** | **Assessment Pod Bypass via `overrideRoute: "fast-track"`** | 🟠 High |
| **PEN-003** | **Soft-Deleted Blocker Creates Permanent Dispatch Block** | 🟠 High |
| **PEN-004** | **Unauthenticated Webhook Intake — No Signature Verification** | 🟠 High |
| **PEN-005** | **Unauthenticated Prometheus `/metrics` Exposure** | 🟠 High |
| PEN-006 | No Pagination `limit` Cap — Full Store Dump in 1 Request | 🟡 Medium |
| PEN-007 | Missing `/api/search` Route — DependencyPicker Non-Functional | 🟡 Medium |
| PEN-008 | Cascade Auto-Dispatch via Blocker Rejection (No Human Gate) | 🟡 Medium |
| PEN-009 | No Per-Field Length Validation + No Store Eviction (DoS) | 🟡 Medium |
| PEN-010 | No CORS Policy Configured | 🟢 Low |
| PEN-011 | No Rate Limiting on Any Endpoint | 🟢 Low |

### Red Team Priority Chain
All 4 red-team objectives from `security.config.yml` are mapped to specific exploit chains. PEN-001 is the prerequisite for everything — confirm unauthenticated access first, then:
1. **PEN-002** → Bypass state machine / assessment pod (objective 1)
2. **PEN-006** → Enumerate all items without pagination (objective 4)  
3. **PEN-003** → Access soft-deleted item via dependency gating (objective 2)
4. **PEN-008** → Trigger dispatch via blocker rejection (objective 3)
