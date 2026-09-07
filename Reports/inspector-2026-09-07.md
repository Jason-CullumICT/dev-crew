# TheInspector — Health Audit Report

**Date:** 2026-09-07  
**Branch:** `audit/inspector-2026-09-07-79f4b1`  
**Run:** `run-20260907-072045`  
**Overall Grade: D**

> Grade D: 6 P1 findings — grading config requires 0 P1 for B or better, max 2 P1 for C.

---

## ⚠ ESCALATION → TheGuardians

Two P1 findings match security escalation triggers (injection / missing access control) and **must be reviewed by TheGuardians before any release**:

| ID | CVE / Package | CVSS | Trigger | Action |
|----|---------------|------|---------|--------|
| **DA-001** | `vitest ≤3.2.5` — Arbitrary file read / code execution | 9.8 | missing access control | Escalate → TheGuardians |
| **DA-002** | `protobufjs ≤7.6.4` — Code injection via .proto parsing | 9.8 | injection | Escalate → TheGuardians |

**Immediate mitigations:**
- Firewall-block the vitest UI port (default 51204) in CI/CD now
- Audit all .proto file sources for trust boundaries in platform/orchestrator
- Do not ship this branch until TheGuardians signs off

**To trigger TheGuardians:** Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## Summary

| Severity | Count | Examples |
|----------|-------|---------|
| **P1** | **6** | vitest RCE, protobufjs RCE, search route missing, OTel DoS, uuid buffer overflow |
| **P2** | **23** | CRLF injection (form-data), brace-expansion DoS, metrics histogram missing, enforcer gap |
| **P3** | **20** | OTel tracing absent, duplicate test files, E2E broken test command, 17 moderate CVEs |
| **P4** | **15** | eslint-disable without rationale (×2), 13 low CVEs |
| **Total** | **64** | First audit — all findings NEW (no baseline) |

**Spec coverage:** ~93% (FR-WF-001–013 fully covered; 2 FR-dependency-* gaps; enforcer blind to FR-dependency-* family)

---

## Specialists

| Specialist | Mode | Findings | Notes |
|------------|------|----------|-------|
| quality-oracle | Static | 1P1 / 2P2 / 3P3 / 2P4 | search route missing, metrics drift, enforcer gap |
| dependency-auditor | Static | 5P1 / 21P2 / 17P3 / 13P4 | 56 CVEs across 9/10 workspaces |
| performance-profiler | Static (offline) | — | Services offline — no dynamic testing |
| chaos-monkey | Static (offline) | — | Services offline — no fault injection |

---

## P1 Findings

### QO-001 — GET /api/search not registered in app.ts
`Source/Backend/src/app.ts` | Route → **TheFixer**

`GET /api/search` is never registered. DependencyPicker's typeahead (`workItemsApi.searchItems`) hits 404. Five tests self-annotate as failing. Feature is completely non-functional.

**Fix:** Create `Source/Backend/src/routes/search.ts` with case-insensitive title+description filter, `{data:[]}` wrapper, exclude soft-deleted. Register as `app.use('/api', searchRouter)` in `app.ts`.

---

### DA-001 — vitest ≤3.2.5 — RCE via UI server (CVSS 9.8) 🔴 ESCALATE
`Source/Frontend`, `portal/Frontend` | Route → **TheGuardians**

Attacker accesses vitest UI server (no auth required, default port 51204) and reads arbitrary files or triggers code execution on the CI/build host.

**Fix:** `npm update vitest@^3.2.6` in Source/Frontend and portal/Frontend.

---

### DA-002 — protobufjs ≤7.6.4 — Code injection via .proto parsing (CVSS 9.8) 🔴 ESCALATE
`platform/orchestrator` | Route → **TheGuardians**

Crafted `.proto` file triggers JavaScript eval in protobufjs parser → arbitrary code execution on the orchestrator (the infrastructure that runs all agent pipelines).

**Fix:** Upgrade `@grpc/grpc-js` and `protobufjs` to latest in `platform/orchestrator`.

---

### DA-003 / DA-004 — @opentelemetry packages — DoS on /metrics (CVSS 7.5)
`portal/Backend` | Route → **TheFixer** (bundle with QO-004 OTel fix)

Malformed HTTP to `GET /metrics` crashes Prometheus exporter in portal/Backend.

**Fix:** `npm update @opentelemetry/auto-instrumentations-node@^0.80.0 @opentelemetry/sdk-node@^0.222.0` in portal/Backend.

---

### DA-005 — uuid <11.1.1 — Buffer overflow in v3/v5/v6 (CVSS 7.5)
`Source/Backend` | Route → **TheFixer**

Missing bounds check in `uuid.v3/v5/v6` with `buf` parameter allows out-of-bounds write.

**Fix:** `npm update uuid@^11.1.1` in Source/Backend.

---

## Cross-Reference Map (shared root causes)

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| OTel ecosystem inconsistently managed | QO-004, DA-003, DA-004 | Add OTel to Source/Backend + update portal/Backend OTel in one PR → closes 3 findings |
| Frontend build tooling pinned below CVE fix | DA-001, DA-HIGH-005 | Update vitest + vite in both frontend workspaces → removes P1 escalation |
| Enforcer gap hides FR-dependency-* coverage | QO-001, QO-003 | Add FR-dependency-* to requirements.md → auto-enforces search route going forward |

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-09-07-D.html` | Full HTML report (16 sections, risk matrix, all findings) |
| `Teams/TheInspector/findings/bug-backlog-2026-09-07.json` | Structured bug backlog with escalations array |
| `Teams/TheInspector/findings/dependency-audit-2026-09-07.md` | Full CVE detail from dependency-auditor |
| `Teams/TheInspector/findings/audit-summary-2026-09-07.json` | Machine-readable audit summary |
| `inspector-report.md` | This document |

---

## Trend

**First audit — no baseline available.** All 64 findings classified NEW. This report establishes the baseline for all future audits.

---

_Generated by TheInspector · team_leader · run-20260907-072045_
