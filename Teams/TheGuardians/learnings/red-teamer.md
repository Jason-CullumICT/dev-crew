# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

---

## Run: 2026-04-15 — Aborted (No Attack Surface Map)

### Blocker
`Teams/TheGuardians/artifacts/attack-surface-map.md` did not exist. Per protocol, active exploitation cannot proceed without pen-tester findings. **Pen-tester must run first.**

### Critical Discovery: Application Mismatch

**`security.config.yml` is configured for the wrong app.**

The Docker container (`dev-crew-portal-1`) runs the **dev-crew feature portal** — a different application from the "workflow engine" described in `security.config.yml`.

| Config Expects | Running Reality |
|----------------|-----------------|
| `/api/work-items` | 404 — does not exist |
| `/api/work-items/:id/transition` | 404 — does not exist |
| `/api/work-items/:id/assessment` | 404 — does not exist |
| `/api/dashboard` | 404 (dashboard has sub-routes, not root) |

### Live Endpoints Confirmed Reachable (2026-04-15)

All unauthenticated — no auth check observed on any endpoint:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | 200 | `{"status":"ok","timestamp":"..."}` |
| `/metrics` | GET | 200 | Prometheus metrics exposed |
| `/api/feature-requests` | GET | 200 | `{"data":[]}` — no auth |
| `/api/bugs` | GET | 200 | `{"data":[]}` — no auth |
| `/api/cycles` | GET | 200 | `{"data":[]}` — no auth |
| `/api/pipeline-runs` | GET | 200 | `{"data":[]}` — no auth |
| `/api/search` | GET | 200 | `{"data":[]}` — no auth |
| `/api/team-dispatches` | GET | 200 | `{"data":[]}` — no auth |
| `/api/learnings` | GET | 200 | `{"data":[]}` — no auth |
| `/api/orchestrator/*` | ANY | 502 | Proxy to ORCHESTRATOR_URL (`http://localhost:8080`), currently unreachable |

### Potential High-Value Targets for Next Run (Once Pen-Tester Maps These)

1. **`/api/orchestrator/*` proxy** — Forwards all methods/paths to `ORCHESTRATOR_URL`. If the orchestrator URL is controllable or the target orchestrator has no auth, this is a potential **SSRF / backend pivoting** vector. Container env var `ORCHESTRATOR_URL=http://localhost:8080`.

2. **All list endpoints lack authentication** — Every `GET /api/*` returned 200 with no `Authorization` header. The pen-tester should verify whether write operations (POST/PATCH/DELETE) are also unauthenticated.

3. **`/uploads` static route** — `app.use('/uploads', express.static(...))` — pen-tester should check whether arbitrary files can be uploaded and served.

4. **Source in container differs from `Source/Backend/`** — The container runs from a different codebase than the repo's `Source/Backend/src/`. The repo has a "workflow engine" (work items, state machine); the container has a "feature portal" (feature-requests, bugs, cycles). Security testing must target the **container's routes**, not the repo source.

### Action Required Before Next Red-Team Run

1. Run the **pen-tester** against the actual Docker container source (`/app/Backend/src/` inside `dev-crew-portal-1`).
2. Update `security.config.yml` `critical_entry_points` to reflect the real routes.
3. Update `pentest.objectives` to match the actual application domain.
4. Ensure `Teams/TheGuardians/artifacts/attack-surface-map.md` is populated with `PEN-` findings before dispatching the red-teamer.
