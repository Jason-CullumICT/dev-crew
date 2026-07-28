# TheInspector — System Health Audit Report

**Date:** 2026-07-28  
**Branch:** `audit/inspector-2026-07-28-7e839c`  
**Grade:** 🟠 **D**  
**Scope:** Full codebase — static analysis (services offline; performance-profiler and chaos-monkey skipped)  
**Specialists:** quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭️ · chaos-monkey ⏭️

> 📄 Full HTML report: `Teams/TheInspector/findings/audit-2026-07-28-D.html`  
> 📋 Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-2026-07-28.json`

---

## Grade Rationale

| Threshold | Criteria | Actual | Pass? |
|-----------|----------|--------|-------|
| A | max_p1: 0, max_p2: 3, spec ≥ 80% | P1: 4 | ❌ |
| B | max_p1: 0, max_p2: 8, spec ≥ 60% | P1: 4 | ❌ |
| C | max_p1: 2, max_p2: 15, spec ≥ 40% | P1: 4 | ❌ |
| **D** | **max_p1: 999** | **P1: 4** | **✅** |

4 P1 findings (3 CVE critical + 1 spec-drift) exceed the C-grade ceiling of 2.

---

## 🚨 Security Escalation — [ESCALATE → TheGuardians]

> **Trigger TheGuardians before next release.** No PR found; escalation logged to console.

| Finding | Type | Trigger | Timeline |
|---------|------|---------|----------|
| DEP-001: Handlebars.js RCE | Injection · RCE | `injection` | **Block deployment** |
| DEP-002: Vitest Arbitrary File Read | File disclosure · RCE | `sensitive data exposed` | This sprint |
| DEP-003: Portal Critical CVEs | Injection chain (TBD) | `injection` | This sprint |
| DEP-005: form-data CRLF Injection | HTTP header poisoning | `injection` | Next sprint |

---

## Scorecard

| Severity | Count | Breakdown |
|----------|-------|-----------|
| **P1 Critical** | **4** | QO: 1 · DEP: 3 |
| **P2 High** | **9** | QO: 4 · DEP: 5 |
| **P3 Moderate** | **7** | QO: 1 · DEP: 6 |
| **P4 Low** | **1** | QO: 1 |
| **Total** | **21** | All NEW (first audit) |
| **Escalations** | **4** | → TheGuardians |
| Plan spec coverage | 93% avg | WF: 92.3% · DepLink: 93.8% |
| Domain spec coverage | **0%** ⚠️ | Specifications/dev-workflow-platform.md unimplemented |
| Total CVEs (npm) | 94 | 8 critical · 29 high · 55 moderate · 2 low |

---

## Trend

**First audit — no baseline.** All 21 findings are NEW. Next audit scheduled 2026-08-28.

---

## P1 Findings (Critical)

### QO-001 · spec-drift · P1
**Specifications/dev-workflow-platform.md — 69 FRs with 0% implementation**  
`Specifications/dev-workflow-platform.md:337–452`

69 active requirements (FR-001–FR-069) describe a system that was never built. Current `Source/` implements the Self-Judging Workflow Engine (FR-WF-*). The spec was never retired or marked superseded. CLAUDE.md's "specs are source of truth" rule is violated at the domain level.

**Fix:** Add `## Status: Superseded — see Specifications/workflow-engine.md` to the file.  
**Route:** Solo session · This sprint

---

### DEP-001 · CVE · Injection · RCE · P1 · [ESCALATE → TheGuardians]
**Handlebars.js JavaScript Injection — remote code execution**  
`Source/Backend` · `handlebars ≤ 4.7.8` · CVEs: GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpv-hc6g-r9c6

Attackers can execute arbitrary JavaScript via crafted Handlebars template ASTs. One command to fix — patch available, no breaking changes.

**Fix:** `cd Source/Backend && npm update handlebars`  
**Timeline:** **Block deployment**

---

### DEP-002 · CVE · File Disclosure · RCE · P1 · [ESCALATE → TheGuardians]
**Vitest Arbitrary File Read — reads host filesystem when UI server is running**  
`Source/Frontend` · `vitest < 3.2.6` · CVE: GHSA-5xrq-8626-4rwp

Any network-accessible developer machine running `vitest --ui` exposes arbitrary host files to attackers. Secrets, keys, source files all readable.

**Fix:** `cd Source/Frontend && npm update vitest`  
**Timeline:** This sprint

---

### DEP-003 · CVE · Critical · P1 · [ESCALATE → TheGuardians]
**Portal Dependencies — 4 unidentified critical CVEs (2 per workspace)**  
`portal/Backend`, `portal/Frontend` · 54 CVEs each · specific chains TBD

Portal workspaces are significantly bloated (54+ packages, 54 CVEs each). Critical CVE chains not fully identified in this pass — require TheGuardians investigation.

**Fix:** `npm audit fix` in each portal workspace after CVE chain identification. Consider architectural separation.  
**Timeline:** This sprint

---

## P2 Findings (High)

| ID | Category | Title | Fix Timeline |
|----|----------|-------|------|
| QO-002 | spec-drift | Traceability enforcer skips 7 plan files — false PASSED result | Next sprint |
| QO-003 | untested | FR-WF-013 observability: 4 workflow Prometheus counters have no test | Next sprint |
| QO-004 | arch-violation | Route handlers import store directly, bypassing service layer | Next sprint |
| QO-005 | spec-drift/untested | FR-dependency-seed: no implementation, no test | Next sprint |
| DEP-004 | CVE · DoS | brace-expansion DoS — process hang via unbounded expansion | Next sprint |
| DEP-005 | CVE · Injection | form-data CRLF injection in multipart headers (CVSS 7.5) | Next sprint |
| DEP-006 | CVE · High | vite high-severity vulnerabilities in dev server | Next sprint |
| DEP-007 | CVE · High | postcss potential code execution | Next sprint |
| DEP-008 | CVE · High | ws WebSocket high-severity | Next sprint |

---

## Cross-Reference Map

Three root causes span multiple findings. Fixing each root cause resolves all grouped findings:

### Root Cause 1: Traceability infrastructure covers <15% of requirements surface
**Resolves:** QO-001 (P1), QO-002 (P2), QO-005 (P2)  
**Single fix:** Expand CLAUDE.md gate to all `Plans/*/requirements.md` + retire `dev-workflow-platform.md`

### Root Cause 2: Spec-traced FRs exist in source but lack test implementations
**Resolves:** QO-003 (P2), QO-005 (P2)  
**Single fix:** Create `workflow-metrics.test.ts` + implement FR-dependency-seed with test

### Root Cause 3: No automated npm audit gate in CI — 94 CVEs accumulate undetected
**Resolves:** DEP-001 (P1), DEP-002 (P1), DEP-003 (P1), DEP-004–DEP-008 (P2)  
**Single fix:** Add `npm audit --audit-level=high` to CI + run `npm update` in each workspace

---

## Spec Coverage

| Area | Coverage |
|------|----------|
| Plans/self-judging-workflow | **92.3%** ✅ |
| Plans/dependency-linking | **93.8%** ✅ |
| Specifications/dev-workflow-platform.md | **0%** 🚨 |
| Other Plans (7 files, not scanned) | **—** (enforcer blind spot) |

Uncovered requirements: FR-WF-013 (no test), FR-dependency-seed (no impl + no test), FR-001–FR-069 (superseded spec).

---

## Latency Baselines

**Not measured** — services were offline. Performance-profiler skipped. Budgets from config:
- `GET /api/work-items`: p95 ≤ 100ms
- `GET /api/dashboard`: p95 ≤ 150ms
- All other routes: p95 ≤ 200ms, p99 ≤ 500ms

---

## Recommendations

| Priority | Action |
|----------|--------|
| 🚫 **Block deployment** | DEP-001: `cd Source/Backend && npm update handlebars` |
| 🏃 **This sprint** | DEP-002: upgrade vitest · DEP-003: investigate portal CVEs · QO-001: retire dev-workflow-platform.md · Add `npm audit --audit-level=high` to CI |
| 📋 **Next sprint** | QO-002: expand enforcer scope · QO-003: write workflow-metrics test · QO-004: introduce service layer · QO-005: implement FR-dependency-seed · DEP-004/005: update brace-expansion/form-data |
| 📦 **Backlog** | QO-006: delete duplicate tests · QO-007: fix eslint suppressions · DEP-006–014: update remaining deps · portal architectural separation · enable Dependabot |

---

## P3 / P4 Summary

| ID | Sev | Title |
|----|-----|-------|
| QO-006 | P3 | Duplicate test files: WorkItemDetailPage + WorkItemListPage |
| DEP-009 | P3 | uuid — moderate CVE |
| DEP-010 | P3 | qs — prototype pollution (via express) |
| DEP-011 | P3 | body-parser — invalid limit bypass |
| DEP-012 | P3 | react-router-dom — moderate CVEs |
| DEP-013 | P3 | esbuild — moderate (cascades from vite update) |
| DEP-014 | P3 | @babel/core — file read via sourceMappingURL (≤7.29.0) |
| QO-007 | P4 | eslint-disable suppressing exhaustive-deps in 2 hooks |

---

## Bug Backlog JSON

```json
{
  "audit_date": "2026-07-28",
  "grade": "D",
  "p1_total": 4,
  "p2_total": 9,
  "p3_total": 7,
  "p4_total": 1,
  "escalations_count": 4,
  "escalations_team": "TheGuardians",
  "escalation_ids": ["DEP-001", "DEP-002", "DEP-003", "DEP-005"],
  "thefixer_p1_ids": ["QO-001"],
  "thefixer_p2_ids": ["QO-002", "QO-003", "QO-004", "QO-005", "DEP-004", "DEP-006", "DEP-007", "DEP-008"],
  "thefixer_p3_ids": ["QO-006", "DEP-009", "DEP-010", "DEP-011", "DEP-012", "DEP-013", "DEP-014"],
  "thefixer_p4_ids": ["QO-007"],
  "full_backlog": "Teams/TheInspector/findings/bug-backlog-2026-07-28.json"
}
```

---

*Generated by TheInspector · team_leader (sonnet) · 2026-07-28*  
*Full HTML: `Teams/TheInspector/findings/audit-2026-07-28-D.html`*  
*Next audit: 2026-08-28*
