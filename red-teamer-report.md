---

## 🛑 Red Teamer — Aborted: Prerequisites Not Met

**Reason:** `Teams/TheGuardians/artifacts/attack-surface-map.md` does not exist and contains zero `PEN-` findings. Per protocol, active exploitation cannot proceed without the pen-tester's Attack Surface Map.

---

### What I Found During Pre-Flight

**The backend IS running** (`dev-crew-portal-1` container, healthy) — but there is a **critical application mismatch**:

| `security.config.yml` Expects | Actual Running App |
|-------------------------------|-------------------|
| `/api/work-items` | ❌ 404 — does not exist |
| `/api/work-items/:id/transition` | ❌ 404 — state machine not present |
| Work item objectives (bypass state machine, force invalid status) | ❌ Wrong app entirely |

The Docker container runs the **dev-crew feature portal** (feature requests, bugs, cycles, pipeline runs), not the "workflow engine" that the security config was written for. These are two entirely different codebases.

**Live endpoints confirmed reachable (all unauthenticated):**

| Endpoint | Status |
|----------|--------|
| `/api/feature-requests` | ✅ 200 — no auth |
| `/api/bugs` | ✅ 200 — no auth |
| `/api/cycles` | ✅ 200 — no auth |
| `/api/pipeline-runs` | ✅ 200 — no auth |
| `/api/team-dispatches` | ✅ 200 — no auth |
| `/api/learnings` | ✅ 200 — no auth |
| `/api/search` | ✅ 200 — no auth |
| `/api/orchestrator/*` | ⚠️ 502 — proxy to `http://localhost:8080` (unreachable) |

**Notable pre-exploitation observations:**
- Every read endpoint returned 200 with no `Authorization` header — potential broken access control
- `/api/orchestrator/*` is a full reverse proxy that forwards all methods/paths to `ORCHESTRATOR_URL` — potential SSRF pivot point worth the pen-tester examining closely

---

### Required Actions Before Re-Dispatch

1. **Run the pen-tester** targeting the actual container source (`/app/Backend/src/` inside `dev-crew-portal-1`) — specifically the routes listed above
2. **Update `security.config.yml`** — `critical_entry_points` must be updated to the real routes (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.)
3. **Update `pentest.objectives`** to match the actual domain
4. Once `attack-surface-map.md` has `PEN-` findings, re-dispatch the red-teamer

Learnings saved to `Teams/TheGuardians/learnings/red-teamer.md` for the next run.
