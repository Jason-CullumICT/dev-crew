## Attack Surface Map — Complete

The full map has been written to `Teams/TheGuardians/artifacts/attack-surface-map.md`. Here's the summary:

---

### 16 Findings Mapped

| Severity | Count | Key Findings |
|----------|-------|-------------|
| **Critical** | 5 | No auth anywhere, no RBAC, fast-track override, webhook injection, IDOR |
| **High** | 4 | Manual approve bypass, soft-delete of any item, cascade dispatch hijack, dependency gate clearing |
| **Medium** | 4 | Unbounded pagination, Prometheus exposed, no CORS, stale-blocker DoS |
| **Low** | 3 | `overrideRoute` field corruption, error info leak, iframe open redirect |

---

### Three Most Exploitable Chains for the Red Teamer

1. **Full Workflow Hijack** — `GET /work-items` to enumerate → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch` — any item goes from Backlog to InProgress without touching the assessment pod. *Directly satisfies the "bypass state machine" objective.*

2. **Dependency Gate Bypass** — `PATCH /:id {"blockedBy":[]}` clears all blockers on any approved-but-gated item, enabling immediate dispatch. *Directly satisfies "access or modify via direct ID reference" objective.*

3. **Full Enumeration** — `GET /api/work-items?limit=999999999` returns all items in a single unauthenticated request. *Directly satisfies "enumerate without pagination limit" objective.*

The systemic root cause is the **complete absence of authentication and authorization** — every other finding is a consequence of this.
