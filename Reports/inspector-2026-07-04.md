# TheInspector — Audit Report Index

**Audit ID:** `run-20260704-055843`  
**Date:** 2026-07-04  
**Branch:** `audit/inspector-2026-07-04-171a4a`  
**Grade:** **D**

---

## Output Files

| File | Description |
|------|-------------|
| [`Teams/TheInspector/findings/audit-20260704-D.html`](Teams/TheInspector/findings/audit-20260704-D.html) | Full HTML report (16 sections) |
| [`Teams/TheInspector/findings/bug-backlog-20260704.json`](Teams/TheInspector/findings/bug-backlog-20260704.json) | Structured bug backlog with escalations array |

---

## Summary

| Metric | Value |
|--------|-------|
| **Grade** | D |
| **P1 Critical** | 4 (3 escalated → TheGuardians) |
| **P2 High** | 8 |
| **P3 Medium** | 10 |
| **P4 Low** | 2 |
| **Spec Coverage** | 97% |
| **CI Enforcer Coverage** | 32% ⚠️ |
| **Total CVEs** | 16 (3 Critical, 5 High, 7 Medium, 1 Low) |
| **Prior Grade** | N/A (first audit) |

---

## Escalations → TheGuardians

Three critical CVEs with injection / RCE vectors require TheGuardians security review:

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| DEP-001 | Handlebars.js JavaScript Injection (jest chain) | 9.8 | Code injection in test infrastructure |
| DEP-002 | vitest UI Arbitrary File Read & RCE | 9.8 | Sensitive data exposed / RCE if UI port open |
| DEP-003 | protobufjs Arbitrary Code Execution (gRPC) | 9.8 | Code injection via untrusted protobuf schema |

---

## P1 Non-Security Findings → TheFixer

| ID | Finding |
|----|---------|
| QO-001 | `GET /api/search` not mounted in `app.ts` — DependencyPicker typeahead returns 404 in production |

---

## Grading Rationale

Per `inspector.config.yml`:
- **A**: max_p1=0 → ❌ (4 P1s)
- **B**: max_p1=0 → ❌ (4 P1s)
- **C**: max_p1=2 → ❌ (4 P1s exceed limit)
- **D**: any worse → ✅ **Grade D**

---

## Cross-Reference Map (4 root causes → 10 findings)

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| Outdated gRPC chain in Orchestrator | DEP-003 (P1), DEP-008 (P2) | Upgrade `@grpc/grpc-js@^1.14.4` |
| Vite dev chain outdated in Frontend | DEP-004, DEP-006 (P2), DEP-012 (P3) | `vite@^5.5.0` |
| express ≤4.18.x | DEP-005, DEP-007 (P2), DEP-010 (P3) | `express@^4.21.0` |
| Enforcer auto-selects one spec file | QO-003, QO-004 (P2) | Fix `traceability-enforcer.py` |

---

## Specialist Coverage

| Specialist | Mode | P1 | P2 | P3 | P4 |
|-----------|------|----|----|----|----|
| quality-oracle | static | 1 | 3 | 3 | 1 |
| dependency-auditor | static | 3 | 5 | 7 | 1 |
| performance-profiler | offline | — | — | — | — |
| chaos-monkey | offline | — | — | — | — |
