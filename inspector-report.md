# TheInspector — Health Report Summary

**Audit ID:** run-20260703-060752  
**Date:** 2026-07-03  
**Grade:** D  
**Scope:** Full codebase (static) — first audit, no prior baseline

## Specialists

| Specialist | Mode | Grade | P1 | P2 | P3 |
|---|---|---|---|---|---|
| quality-oracle | static | C | 1 | 4 | 3 |
| dependency-auditor | static | C | 2 | 4 | 16 |
| performance-profiler | **SKIPPED** (backend offline) | — | — | — | — |
| chaos-monkey | **SKIPPED** (services offline) | — | — | — | — |

## Overall Totals

| Severity | Count |
|---|---|
| P1 Critical | **3** |
| P2 High | **8** |
| P3 Moderate | **19** |
| P4 Low | **2** |

## Grade Rationale

Grade D — 3 P1 findings exceed the C threshold of max_p1:2 per `inspector.config.yml`.  
Resolving the 3 P1s and 4 quick P2 fixes (dep patches) would restore grade C or B.

## Security Escalations → TheGuardians

| Finding | Package | CVSS | Trigger |
|---|---|---|---|
| DEP-001 | handlebars@4.7.8 | 9.8 | JavaScript injection via AST type confusion |
| DEP-002 | vitest@3.2.5 | 9.8 | Arbitrary file read/exec via UI server |
| DEP-003 | form-data@4.0.5 | 7.5 | CRLF injection in HTTP headers |

## P1 Summary

- **QO-001** — Traceability enforcer blind to `portal/` and `platform/`: 86 requirements falsely reported missing on every CI run. Fix: add portal + platform to `source_dirs` in `tools/traceability-enforcer.py:78`.
- **DEP-001** — Handlebars.js CVSS 9.8 JS injection (backend). Fix: `npm update handlebars` in Source/Backend.
- **DEP-002** — Vitest CVSS 9.8 arbitrary file read (frontend devDep). Fix: `npm update vitest` in Source/Frontend.

## TheFixer Backlog (P2 non-security)

| ID | Title | File |
|---|---|---|
| QO-002 | FR-dependency-seed: seed.ts missing | portal/Backend/src/database/seed.ts |
| QO-003 | UpdateBugInput/UpdateFeatureRequestInput missing blocked_by | portal/Shared/api.ts:59 |
| QO-004 | FR-070–073 namespace collision (two features, same IDs) | Plans/image-upload/requirements.md:9 |
| QO-005 | Route handlers import store directly — bypasses service layer | Source/Backend/src/routes/workItems.ts:12 |
| DEP-004 | Vite fs.deny bypass on Windows alternate paths | Source/Frontend (vite@6.4.2) |
| DEP-005 | ws WebSocket memory exhaustion DoS | Source/Frontend (ws@8.20.1) |
| DEP-006 | Express/qs null pointer crash on malformed query | Source/Backend (express@4.22.1) |

## Reports Generated

- **HTML Report:** `Teams/TheInspector/findings/audit-2026-07-03-D.html`
- **JSON Backlog:** `Teams/TheInspector/findings/bug-backlog-2026-07-03.json`

## Trend

First audit — no prior baseline. Target: re-run with services online after P1/P2 remediation. Expected grade after fixes: **B**.
