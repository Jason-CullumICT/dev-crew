Static analysis complete. Here's the full summary of what was found:

---

## Attack Surface Map — Complete

**12 findings** across the dev-crew Source App. Written to `Teams/TheGuardians/artifacts/attack-surface-map.md`.

### Critical (2)
| ID | Finding |
|---|---|
| **PEN-001** | **Zero Authentication** — No auth middleware anywhere. The entire API is anonymous |
| **PEN-002** | **No Authorization** — Any caller can approve, reject, dispatch, or route any work item |

### High (5)
| ID | Finding |
|---|---|
| **PEN-003** | **Fast-Track Override** — `POST /:id/route` with `{"overrideRoute":"fast-track"}` jumps `backlog → approved` in one call, bypassing the entire assessment pod |
| **PEN-004** | **Intake Enum Bypass** — `/api/intake/zendesk` and `/api/intake/automated` skip enum validation that exists on the standard creation endpoint; arbitrary `type`/`priority` strings are stored |
| **PEN-005** | **No Webhook Auth** — Zendesk endpoint accepts any POST with no HMAC signature check |
| **PEN-006** | **Unbounded Enumeration** — `?limit=999999` on work items; `/dashboard/queue` is always a full dump with no pagination at all |
| **PEN-007** | **Cascade Dispatch via Rejection** — Rejecting a blocker item triggers `onItemResolved()`, auto-dispatching all approved dependents without any `POST /dispatch` call |

### Medium (4)
| ID | Finding |
|---|---|
| **PEN-008** | **Soft-Delete ID Leak** — Dispatch gating error exposes UUID + docId of soft-deleted blockers in the `unresolvedBlockers` response body |
| **PEN-009** | **NeedsClarification → Rejected Bug** — Assessment's `needs-clarification` verdict silently maps to `Rejected` status (else-branch logic flaw); assessment outcomes are fully deterministic and manipulable |
| **PEN-010** | **Unauthenticated /metrics** — Prometheus endpoint publicly exposes operational counters and Node.js heap/GC stats |
| **PEN-011** | **Unrestricted Text Fields** — No `maxLength` on `title`, `description`, or `reason` fields; stored content amplifies response sizes and inflates heap |

### Low (1)
| **PEN-012** | Frontend `searchItems()` calls `/api/search` which doesn't exist in the backend — framework fingerprinting via 404 |

**Three complete exploit chains** are documented (Chain Alpha: 3-request full takeover; Chain Beta: covert cascade dispatch; Chain Gamma: full data exfiltration). All red team config objectives are mapped to specific PEN IDs with exact `curl` payloads ready to execute.
