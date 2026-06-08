The pipeline dashboard requires an orchestrator-created run ID (not present in this standalone invocation). The analysis is complete. Here is a summary of findings:

---

## Attack Surface Map — Complete

Written to: `Teams/TheGuardians/artifacts/attack-surface-map.md`

### Findings (15 total)

| ID | Severity | Title |
|----|----------|-------|
| PEN-001 | **Critical** | No Authentication on Any Endpoint |
| PEN-002 | **Critical** | No RBAC — Anyone Can Approve/Reject/Dispatch |
| PEN-003 | **Critical** | State Machine Bypass via `overrideRoute: "fast-track"` — Instant Approval |
| PEN-004 | **Critical** | Unauthenticated Intake Webhooks + Missing Enum Validation |
| PEN-005 | **High** | Soft-Deleted Blocker Creates Permanent Phantom Block |
| PEN-006 | **High** | Unauthenticated `/metrics` Endpoint — Information Disclosure |
| PEN-007 | **High** | Unbounded `limit` Parameter — Memory Exhaustion DoS |
| PEN-008 | **High** | `NeedsClarification` Verdict Maps to `Rejected` — Business Logic Flaw |
| PEN-009 | **High** | `routing → approved` Transition Skips Assessment Pod |
| PEN-010 | **Medium** | `overrideRoute` Not Validated Against Enum — State Corruption |
| PEN-011 | **Medium** | Dashboard Exposes Full Internal Item State + ID Enumeration |
| PEN-012 | **Medium** | Unauthenticated Rejection Triggers Cascade Auto-Dispatch |
| PEN-013 | **Medium** | No CORS Policy — Cross-Origin API Access |
| PEN-014 | **Medium** | No Rate Limiting — Brute Force and Flood Attack |
| PEN-015 | **Low** | Non-Atomic Routing State — Forward-Looking Race Condition |

### Key Attack Chains for Red Teamer
1. **Full lifecycle in 3 requests** (no auth): `POST /work-items` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch` — item goes `backlog → approved → in-progress`, skipping assessment entirely.
2. **Force cascade dispatch via malformed assessment**: Create item without `complexity` → assess → `NeedsClarification` verdict silently becomes `Rejected` → `onItemResolved` auto-dispatches all dependent approved items.
3. **Permanent blocker injection**: Add dependency on a blocker you control → soft-delete the blocker → target item is permanently stuck in approved-but-blocked state.
4. **Spoof Zendesk with invalid types**: `POST /api/intake/zendesk` with `{"type":"INJECTED","priority":"INJECTED"}` — passes no validation, injects corrupt enum values.
