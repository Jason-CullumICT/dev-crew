# TheInspector Audit Report — 2026-11-25

**Grade: D** | Branch: `audit/inspector-2026-11-25-cdf88a` | Scope: Full codebase (static)

---

## Grade Rationale

| Threshold | Limit | Actual | Result |
|-----------|-------|--------|--------|
| A: max P1 | 0 | **6** | ❌ |
| B: max P1 | 0 | **6** | ❌ |
| C: max P1 | 2 | **6** | ❌ |
| **D** | — | 6 P1s | ✅ **Grade D** |

6 P1 findings — 5 critical CVEs (CVSS ≥9.1) in production dependencies + 1 broken verification gate.

---

## Summary Counts

| Severity | Count | Escalation |
|----------|-------|-----------|
| P1 | 6 | 5 → TheGuardians |
| P2 | 14 | 2 → TheGuardians |
| P3 | 25 | — |
| P4 | 2 | — |
| **Total** | **47** | **7 → TheGuardians** |

---

## Trend

**First audit — no baseline available.** All 47 findings are NEW.

---

## Specialists

| Specialist | Mode | Status | P1 | P2 | P3 | P4 |
|-----------|------|--------|----|----|----|----|
| quality-oracle | static | ✅ complete | 1 | 2 | 3 | 2 |
| dependency-auditor | static | ✅ complete | 5 | 12 | 21 | 0 |
| performance-profiler | — | ⚫ not run (services offline) | — | — | — | — |
| chaos-monkey | — | ⚫ not run (services offline) | — | — | — | — |

---

## Escalations to TheGuardians (7)

| ID | Finding | CVSS |
|----|---------|------|
| DEP-001 | handlebars JavaScript injection via AST type confusion | 9.8 |
| DEP-002 | proxy-addr IP spoofing — access control bypass | 9.1 |
| DEP-003 | vitest UI arbitrary file read + RCE | 9.8 |
| DEP-004 | tinypool prototype pollution RCE | 9.8 |
| DEP-005 | protobufjs arbitrary code execution | 9.8 |
| DEP-009 | form-data CRLF injection / HTTP response splitting | 7.5 |
| DEP-015 | vite launch-editor command injection | 7.5 |

---

## P1 Findings

| ID | Source | Title | File |
|----|--------|-------|------|
| QO-001 | quality-oracle | Traceability enforcer never scans portal/ or platform/ | tools/traceability-enforcer.py:70 |
| DEP-001 | dependency-auditor | handlebars — JavaScript injection (CVSS 9.8) | Source/Frontend |
| DEP-002 | dependency-auditor | proxy-addr — access control bypass (CVSS 9.1) | Source/Backend, platform/orchestrator |
| DEP-003 | dependency-auditor | vitest — arbitrary file read + RCE (CVSS 9.8) | Source/Frontend |
| DEP-004 | dependency-auditor | tinypool — prototype pollution RCE (CVSS 9.8) | Source/Frontend (via vitest) |
| DEP-005 | dependency-auditor | protobufjs — code execution (CVSS 9.8) | platform/orchestrator |

---

## Immediate Actions (before next deploy)

1. `npm install handlebars@^4.7.10` — Source/Frontend
2. `npm install proxy-addr@^2.0.8` — Source/Backend + platform/orchestrator
3. `npm install vitest@^5.1.1 --save-dev` — Source/Frontend (also fixes DEP-004, DEP-019, DEP-020)
4. `npm install protobufjs@^7.6.5` — platform/orchestrator
5. `npm install vite@^8.3.8 --save-dev` — Source/Frontend
6. `npm install form-data@^4.0.6` — Source/Backend + platform/orchestrator
7. Fix `tools/traceability-enforcer.py:70` to scan `portal/` and `platform/`

---

## Deliverables

- **HTML Report:** `Teams/TheInspector/findings/audit-2026-11-25-D.html`
- **Bug Backlog JSON:** `Teams/TheInspector/findings/bug-backlog-2026-11-25.json`

---

## Spec Coverage

| Spec | FRs | Covered | % | Note |
|------|-----|---------|---|------|
| workflow-engine.md | 13 | 13 | 100% | ✅ |
| dev-workflow-platform.md | 69 | 69 | 100% | ⚠️ enforcer blind — portal/ not scanned |
| tiered-merge-pipeline.md | 10 | 9 | 90% | FR-TMP-008 untraced |
| Unspecified in codebase | 30+ | 0 | 0% | FR-070+, FR-DUP-*, dependency FRs |
