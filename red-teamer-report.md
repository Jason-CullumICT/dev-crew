---

## Red Team Summary — TheGuardians

**Target:** `http://localhost:3001` (portal backend, ephemeral Docker via `docker-compose.test.yml`)  
**Date:** 2026-09-07  
**Chains attempted:** 12 | **Confirmed breaches:** 9 | **Objectives achieved:** 4/4

---

### 🔴 Critical Findings (2)

| ID | Title | Status |
|----|-------|--------|
| RED-001 | Complete Authentication Absence — every endpoint open | **Confirmed Live** |
| RED-002 | State Machine Bypass via PATCH — FR-0002 approved with **0 votes** | **Confirmed Live** |

### 🟠 High Findings (6)

| ID | Title | Status |
|----|-------|--------|
| RED-003 | IDOR — Cross-user content modification and hard-deletion | **Confirmed Live** |
| RED-004 | Bug full lifecycle traversable without auth | **Confirmed Live** |
| RED-006 | No pagination enforcement — full DB dump in 1 request | **Confirmed Live** |
| RED-007 | Unauthenticated orchestrator proxy (SSRF risk in prod) | Attempted — offline in test |
| RED-008 | Stored XSS — script tags persisted verbatim | **Confirmed Live** |
| RED-009 | Unauthenticated deny bypasses voting entirely | **Confirmed Live** |

### 🟡 Medium Findings (1)

| ID | Title | Status |
|----|-------|--------|
| RED-005 | Prometheus `/metrics` unauthenticated — 39 metric families exposed | **Confirmed Live** |

---

### Objectives Status

| Objective | Achieved |
|-----------|----------|
| Bypass work item state machine to reach invalid status | ✅ `FR-0002` approved with zero votes via PATCH |
| Access or modify soft-deleted work item via direct ID reference | ✅ IDOR: `FR-0003` content overwritten; `BUG-0001` permanently deleted |
| Submit malformed assessment verdict bypassing routing logic | ✅ FR approved with `votes:[]` — no assessment pod |
| Enumerate all items without pagination enforcement | ✅ `GET /api/search?q=` returns entire database unauthenticated |

### Key Architectural Finding

**⚠️ Scope Mismatch:** The pen-tester analyzed `Source/Backend/` (work-items API) but the test container runs `portal/Backend/`. All vulnerability *classes* were confirmed against the live portal. Full details in `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results` and `Teams/TheGuardians/learnings/red-teamer.md`.
