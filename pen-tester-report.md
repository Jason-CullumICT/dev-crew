The Attack Surface Map has been written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the summary of findings for the red-teamer:

---

## Attack Surface Map — Summary

**Total Findings: 13** | **Critical: 2 | High: 5 | Medium: 3 | Low: 3**

### Critical
| ID | Title | Key Vector |
|----|-------|-----------|
| **PEN-001** | No Authentication on Any Endpoint | All routes open, zero credential required |
| **PEN-002** | Fast-Track Override Bypasses Assessment Pod | `POST /:id/route {"overrideRoute":"fast-track"}` → straight to `approved` |

### High
| ID | Title | Key Vector |
|----|-------|-----------|
| **PEN-003** | Webhook Spoofing — No Signature Validation | Any actor floods intake as Zendesk |
| **PEN-004** | Intake Endpoints Accept Invalid Enum Values | `type`/`priority` not validated on `/intake/*` |
| **PEN-005** | No Pagination Limit Cap | `?limit=999999` dumps entire dataset |
| **PEN-006** | Cascade Auto-Dispatch on Rejection | Create blocker, reject it → target `Approved` item auto-dispatched |
| **PEN-007** | Approve/Reject Override — No Role Check | Anyone can override assessment verdict |

### Medium
| ID | Title |
|----|-------|
| **PEN-008** | Prometheus metrics unauthenticated (operational intelligence leak) |
| **PEN-009** | Soft-deleted blockers permanently orphan dependents + leak IDs |
| **PEN-010** | No CORS policy configured |

### Low
| ID | Title |
|----|-------|
| **PEN-011** | Negative pagination parameters cause unexpected slice behavior |
| **PEN-012** | No length limits on free-text fields (memory inflation via reject-cycle) |
| **PEN-013** | Missing `/api/search` endpoint referenced by frontend |

### Red Team Priority Chain
The **3-step complete bypass** (no auth needed):
```
POST /api/work-items                              → create item
POST /api/work-items/{id}/route {"overrideRoute":"fast-track"}  → approved
POST /api/work-items/{id}/dispatch {"team":"TheATeam"}          → in-progress
```
Zero assessment, zero auth, 3 requests.
