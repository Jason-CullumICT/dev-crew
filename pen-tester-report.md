The dashboard requires an orchestrator-managed run ID (standalone execution has no active run). The artifact is the key deliverable. Here's a summary of what was produced:

---

## Attack Surface Map Complete

**Written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Findings Breakdown (11 total)

| ID | Severity | Title |
|----|----------|-------|
| PEN-001 | **Critical** | Complete Absence of Authentication & Authorization |
| PEN-002 | **Critical** | Fast-Track Override Bypasses Assessment Pod (state machine) |
| PEN-003 | **High** | Direct Approve Endpoint Skips Mandatory Assessment Pod |
| PEN-004 | **High** | Unlimited Pagination — Full Dataset Enumeration |
| PEN-005 | **High** | Intake Webhooks — No Auth, No Signature, No Enum Validation |
| PEN-006 | **High** | Cascade Auto-Dispatch Bypasses Manual Dispatch Gate |
| PEN-007 | **Medium** | Soft-Deleted Blocker Permanently Locks Dependent from Dispatch |
| PEN-008 | **Medium** | Unauthenticated Prometheus Metrics Endpoint |
| PEN-009 | **Medium** | No Rate Limiting — Memory Exhaustion via Intake Endpoints |
| PEN-010 | **Low** | Internal Exception Messages Disclosed to Clients |
| PEN-011 | **Low** | Missing Search Endpoint (informational) |

---

### Red-Team Attack Chains Identified

| Chain | Steps |
|-------|-------|
| **CHAIN-A** | Create → `route` w/ `overrideRoute:"fast-track"` → dispatch → **InProgress with zero review** |
| **CHAIN-B** | Create → route → `approve` (direct) → dispatch → **assessment pod never runs** |
| **CHAIN-C** | `GET /api/work-items?limit=9999999` → **entire dataset in one request** |
| **CHAIN-D** | Create dependency → soft-delete blocker → **dependent permanently undispatchable** |
| **CHAIN-E** | Create N approved dependents → reject blocker → **N items cascade to InProgress** |
| **CHAIN-F** | `POST /api/intake/zendesk` with invalid enum `type` → **corrupt data inserted** |

All chains are executable anonymously — PEN-001 confirms there is no authentication gate to bypass first.
