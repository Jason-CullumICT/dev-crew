## Attack Surface Map Complete

The analysis is written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's what was found across the full static trace:

---

### 11 Findings — 2 Critical, 3 High, 4 Medium, 2 Low

| ID | Severity | Title |
|----|----------|-------|
| **PEN-001** | **Critical** | Complete absence of authentication/authorization — every endpoint is open |
| **PEN-002** | **Critical** | `overrideRoute: "fast-track"` bypasses assessment pod, jumps any item to `approved` |
| **PEN-003** | **High** | Soft-deleting a blocker permanently deadlocks its dependents (dispatch forever blocked) |
| **PEN-004** | **High** | Intake webhooks accept invalid enum values for `type`/`priority` (no validation) |
| **PEN-005** | **High** | Stored XSS via unsanitized `title`, `description`, and `reason` fields |
| **PEN-006** | **Medium** | Unbounded `?limit=` parameter enables full data enumeration + memory-pressure DoS |
| **PEN-007** | **Medium** | Prometheus `/metrics` exposed publicly without authentication |
| **PEN-008** | **Medium** | Items in `reviewing` status can be re-assessed repeatedly (race/bloat) |
| **PEN-009** | **Medium** | Cascade auto-dispatch (`onItemResolved`) bypasses `VALID_STATUS_TRANSITIONS` guard |
| **PEN-010** | **Low** | `/api/search` referenced by frontend doesn't exist on backend (dead endpoint) |
| **PEN-011** | **Low** | Sequential `docId` counter leaks creation rate (information disclosure) |

### Root Cause
The dominant root cause is **PEN-001** — zero authentication — which makes every other finding trivially exploitable with no bypass complexity. The second most impactful is **PEN-002**, which allows any caller to collapse the entire `backlog → assessment → approved` pipeline into a single HTTP request.
