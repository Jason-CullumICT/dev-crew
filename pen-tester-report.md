Dashboard run ID isn't registered (no active pipeline run), but the analysis and artifacts are complete. Here is the full summary:

---

## Attack Surface Map — Complete

**Artifact written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

### Findings Summary: 11 total (3 Critical, 4 High, 3 Medium, 1 Medium)

| ID | Severity | Title |
|---|---|---|
| PEN-001 | **Critical** | No Authentication/Authorization on ANY endpoint |
| PEN-002 | **Critical** | Assessment pod fully bypassed via `overrideRoute: "fast-track"` |
| PEN-003 | **Critical** | Unauthenticated manual approve overrides state machine |
| PEN-004 | **High** | No pagination limit — full data enumeration with `?limit=9999999` |
| PEN-005 | **High** | Intake routes store unvalidated enum values (`type`, `priority`) |
| PEN-006 | **High** | Intake webhooks have no signature/identity verification |
| PEN-007 | **High** | Soft-deleted blocker creates permanent dispatch block; leaks deleted UUID |
| PEN-008 | **Medium** | Arbitrary string accepted as `overrideRoute`, stored without enum guard |
| PEN-009 | **Medium** | `NeedsClarification` silently collapses to `Rejected` → unauthorized cascade dispatch |
| PEN-010 | **Medium** | In-memory store returns live references → race condition on `changeHistory` |
| PEN-011 | **Medium** | Prometheus `/metrics` endpoint unauthenticated — internal counter disclosure |

### Top Red Team Exploit Chains (mapped to config objectives):
1. **State machine bypass**: `POST /:id/route { "overrideRoute": "fast-track" }` → direct Approved with zero assessment
2. **Full enumeration**: `GET /api/work-items?limit=9999999`
3. **Malformed verdict cascade**: Assess item without `complexity` → NeedsClarification maps to Rejected → triggers auto-dispatch of all dependents
4. **Soft-delete IDOR**: Create A→B dependency, delete B, confirm A permanently blocked and B's UUID leaks via `/ready`
