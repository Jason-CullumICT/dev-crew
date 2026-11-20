# TheInspector — Health Report Summary

**Run:** `run-20261120-100021` · **Date:** 2026-11-20 · **Grade:** D · **Branch:** `audit/inspector-2026-11-20-98ee13`

## Grade: D

| Dimension | Value | Threshold for C |
|-----------|-------|-----------------|
| P1 findings | **7** | ≤ 2 |
| P2 findings | **17** | ≤ 15 |
| Spec coverage | **15%** | ≥ 40% |

## Specialist Results

| Specialist | Mode | P1 | P2 | P3 | P4 |
|------------|------|----|----|----|----|
| quality-oracle | Static | 2 | 2 | 1 | 0 |
| dependency-auditor | Static | 5 | 15 | 14 | 2 |
| performance-profiler | **Skipped** (services offline) | — | — | — | — |
| chaos-monkey | **Skipped** (services offline) | — | — | — | — |

## Security Escalations → TheGuardians (5)

| ID | Package | Type | Exploitability |
|----|---------|------|----------------|
| DEP-001 | handlebars | RCE (template injection) | Authenticated |
| DEP-002 | proxy-addr | Auth bypass (IP spoofing) | Zero-precondition |
| DEP-003/005 | tinypool via vitest@2.0.5 | RCE (prototype pollution) | Privileged/CI |
| DEP-004 | protobufjs via @grpc/grpc-js | RCE (deserialization) | Zero-precondition |

## Key Non-Security P1s → TheFixer

- **QO-001** — `GET /api/search` never mounted in `app.ts` → DependencyPicker returns 404 silently
- **QO-002** — `traceability-enforcer.py` checks 13 Plan FRs, ignores 69 Specification FRs → CI gate is a false positive

## Full Report

- **HTML report:** `Teams/TheInspector/findings/audit-2026-11-20-D.html`
- **Bug backlog:** `Teams/TheInspector/findings/bug-backlog-2026-11-20.json`
