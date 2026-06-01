---

## Attack Surface Map Complete

**13 findings** written to `Teams/TheGuardians/artifacts/attack-surface-map.md`:

| Severity | Count | Key Findings |
|----------|-------|-------------|
| **Critical** | 2 | PEN-001 (No Auth on ANY endpoint), PEN-002 (No RBAC) |
| **High** | 3 | PEN-003 (Webhook secrets absent), PEN-004 (Fast-track override bypass), PEN-005 (Approve skips assessment) |
| **Medium** | 5 | PEN-006 (Unbounded pagination), PEN-007 (Rejection cascades dispatch), PEN-008 (Soft-delete leaves permanent blockers), PEN-009 (O(N²) BFS DoS), PEN-010 (Missing `/search` endpoint) |
| **Low** | 3 | PEN-011 (Public `/metrics`), PEN-012 (Error message leakage), PEN-013 (NaN pagination) |

### Dominant Structural Weakness
The **complete absence of an authentication layer** in `app.ts` is the root cause amplifying every other finding. All 13 endpoints are publicly accessible with no credential check, enabling unauthenticated callers to create, approve, dispatch, and delete work items in three HTTP calls.

### Highest-Priority Red Team Objectives
1. **Full pipeline hijack in 3 calls:** `POST /work-items` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch {"team":"TheATeam"}` — zero auth, zero assessment.
2. **Unlimited data enumeration:** `GET /api/work-items?limit=999999`
3. **Webhook injection with invalid enum values:** `POST /api/intake/zendesk` with arbitrary `type`/`priority` values that bypass the validation the main create endpoint enforces.
