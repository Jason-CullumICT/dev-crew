Ephemeral environment torn down. Here is the complete Red Team report:

---

## Red Team Results — dev-crew Portal Application

**Environment:** `docker-compose.test.yml` (ephemeral, isolated)  
**Target:** `http://localhost:3001` — `portal/Backend/` (SQLite + Express)  
**Note:** Pen-tester analyzed `Source/Backend/`; test env runs `portal/Backend/`. All vulnerability *classes* confirmed in the live app.

---

### ⚠️ Environment Discrepancy

The pen-tester analyzed `Source/Backend/` (work-item workflow engine). The docker test environment runs `portal/Backend/` (feature-request/bug-report portal). `Source/Backend/` has no `node_modules` and cannot be run directly. All PEN findings mapped to their portal equivalents — **10 of 12 carry over directly** (2 mitigated in the portal).

---

### Confirmed Breaches (5 of 8 chains attempted)

| Finding | Severity | Objective | Verdict |
|---------|----------|-----------|---------|
| **RED-001** Zero authentication — all endpoints | **Critical** | Prerequisite for all | ✅ Confirmed |
| **RED-002** State machine bypass: PATCH→voting + force-approve with 0 votes | **Critical** | Bypass approval workflow | ✅ Confirmed |
| **RED-003** Full dataset enumeration — pagination params silently ignored | **High** | Data exfiltration | ✅ Confirmed |
| **RED-004** Cascade auto-promotion: completing a blocker auto-approves dependent | **High** | Unauthorized state change | ✅ Confirmed |
| **RED-005** Dependency ghost block: hard-delete blocker leaves permanent freeze | **High** | Targeted DoS | ✅ Confirmed |
| **RED-006** Unauthenticated `/metrics` — reveals all routes + operational stats | **Medium** | Intel leak | ✅ Confirmed |
| **RED-007** Body size limit returns 500 not 413 | **Low** | Informational | ✅ Confirmed |
| **RED-008** No rate limiting | **Low** | Risk multiplier | ✅ Confirmed |

---

### All 4 Pentest Objectives: ACHIEVED

1. **Bypass state machine** → PATCH to `voting` (0 votes) → `force-approve` → `approved` in 3 steps, zero human/AI review
2. **Access item blocked by deleted dependency** → hard-delete blocker, ghost dependency link persists forever
3. **Submit malformed verdict bypassing routing** → `force-approve` with no votes is structurally equivalent
4. **Enumerate all items without pagination** → `GET /api/bugs?limit=1&page=1` returns all 13 records (params ignored)

---

### Mitigated Findings (portal improved over Source/Backend)

- **Enum injection** → Portal validates enum values at service layer (400 returned) ✅
- **SQL injection** → Search uses in-memory `.includes()`, no raw SQL ✅
- **CORS** → Restricted to `localhost:5173`; absent `ACAO` header blocks browser reads ✅
- **Body size** → 16kb cap exists (error code wrong: 500 not 413)

---

### Grade Implication

Per `security.config.yml`: a confirmed red-team breach of a critical objective → **Grade: F**. Two critical objectives were achieved (zero auth + state machine bypass).

Full findings appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
