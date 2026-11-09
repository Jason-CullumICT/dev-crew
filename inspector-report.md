# TheInspector — System Health Audit Report

**Audit ID:** `run-20261109-093415`  
**Date:** 2026-11-09  
**Branch:** main  
**Grade:** 🟠 **D**  
**Mode:** Static Analysis Only (services offline — performance-profiler and chaos-monkey skipped)  
**Specialists:** quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭ · chaos-monkey ⏭

---

## Grade Rationale

| Threshold | P1 Max | P2 Max | Min Spec Coverage |
|-----------|--------|--------|-------------------|
| A | 0 | 3 | 80% |
| B | 0 | 8 | 60% |
| C | 2 | 15 | 40% |
| **D** | **999** | — | — |

**Result:** 6 P1 findings (5 security CVEs + 1 broken route). Config threshold C = max 2 P1s. 6 > 2 → **Grade D**.

> Path to B: Fix all 5 CVE P1s (DA-001–DA-005). That drops P1 count to 1 (QO-001) — but config requires max_p1:0 for B/A. Wire GET /api/search (QO-001) to reach 0 P1s. Then fix service-layer bypass (QO-002) and enforce spec coverage ≥60% → **B**.

---

## 🚨 Security Escalation → TheGuardians

**5 P1 findings trigger `[ESCALATE → TheGuardians]`** (injection / access-control bypass vectors):

| ID | CVSS | Title | Trigger |
|----|------|-------|---------|
| DA-001 | 9.8 | vitest <3.2.6 — RCE via tinypool prototype pollution | injection |
| DA-002 | 9.1 | proxy-addr <2.0.8 — IP spoofing, access control bypass | missing access control |
| DA-003 | — | protobufjs ≤7.5.5 — 12 CVEs: code execution + DoS | injection |
| DA-004 | 8.1 | handlebars ≤4.7.8 — 11 CVEs: template injection → RCE | injection |
| DA-005 | — | tinypool ≤2.1.0 — Prototype Pollution RCE (via vitest) | injection |

All five have **zero-precondition exploitability** (network-accessible, no auth required). TheGuardians should verify exploitation paths and confirm remediation before next release.

---

## Finding Counts

| Specialist | P1 | P2 | P3 | P4 | Escalated |
|------------|----|----|----|----|-----------|
| quality-oracle | 1 | 3 | 2 | 1 | 0 |
| dependency-auditor | 5 | 3 | 2 | 0 | 5 |
| **Total** | **6** | **6** | **4** | **1** | **5** |

**172 total vulnerabilities** across 6 npm projects (12 unique critical packages).

---

## Spec Coverage

| Spec | FRs | Traced | Coverage |
|------|-----|--------|----------|
| Plans/self-judging-workflow/requirements.md | 13 | 13 | ✅ 100% |
| Plans/dependency-linking/requirements.md | 16 | ~13 | ⚠️ 81% |
| Specifications/dev-workflow-platform.md | 74 | 0 | 🔴 0% (orphaned spec — different system) |
| Specifications/tiered-merge-pipeline.md | 10 | 0 | ⬜ 0% (infra spec — not Source/) |

**Active plan coverage: ~90%** (excluding orphaned spec). Config minimum for B: 60%.

---

## All Findings

### P1 — Critical

#### QO-001 · spec-drift/untested · → TheFixer
**GET /api/search not wired — 5 tests known-failing**  
Files: `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts:1`  
Detail: `FR-dependency-search` requires `GET /api/search?q=`. Route not in app.ts. Frontend DependencyPicker calls it → 404 in production. Test contract written, implementation not built.  
Fix: Implement `Source/Backend/src/routes/search.ts` and wire into `app.ts`.  
Cross-ref: QO-004 (traceability enforcer blind spot masks this from CI)

#### DA-001 · dependency/rce · → [ESCALATE → TheGuardians]
**vitest <3.2.6 — RCE via Prototype Pollution (CVSS 9.8)**  
Files: `Source/Frontend/package.json`, `portal/Backend/package.json`  
Detail: Tinypool worker-options prototype pollution; network-accessible, no auth. CI/CD pipeline compromise.  
Fix: `npm install vitest@^3.2.6 --save-dev` in Source/Frontend and portal/Backend  
Cross-ref: DA-005 (same tinypool root cause — single fix resolves both)

#### DA-002 · dependency/access-control · → [ESCALATE → TheGuardians]
**proxy-addr <2.0.8 — IP Spoofing (CVSS 9.1) — all 4 Express services**  
Files: Source/Backend, Source/Frontend, platform/orchestrator, portal/Backend  
Detail: IPv4-mapped IPv6 address mishandling. Any IP-based access control, rate limit, or firewall is bypassable.  
Fix: `npm install express@^4.20.0` in each of the 4 services

#### DA-003 · dependency/rce · → [ESCALATE → TheGuardians]
**protobufjs ≤7.5.5 — 12 CVEs: Code Execution, DoS, Prototype Pollution**  
Files: `platform/orchestrator/package.json`, `portal/Backend/package.json`  
Detail: Code injection via bytes field defaults; unbounded recursion DoS; arbitrary code execution via generated code.  
Fix: `npm install protobufjs@>=7.6.0` in platform/orchestrator and portal/Backend

#### DA-004 · dependency/injection · → [ESCALATE → TheGuardians]
**handlebars ≤4.7.8 — Template Injection / RCE via AST Confusion (CVSS 8.1)**  
Files: `Source/Backend/package.json`  
Detail: 11 JS injection CVEs. If user input reaches a Handlebars template → server-side template injection → RCE.  
Fix: `cd Source/Backend && npm audit fix`

#### DA-005 · dependency/rce · → [ESCALATE → TheGuardians]
**tinypool ≤2.1.0 — Prototype Pollution RCE (via vitest)**  
Files: Source/Frontend, portal/Frontend, portal/Backend  
Detail: Same tinypool prototype pollution vector as DA-001. Affects 3 projects.  
Fix: Update vitest to ≥3.2.6 (see DA-001 — single fix resolves both)

---

### P2 — High

#### QO-002 · architecture-violation · → TheFixer
**Route handlers bypass service layer — 3 files import store directly**  
Files: `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`  
Fix: Extract CRUD ops into `workItemService.ts`; routes call service, service calls store.

#### QO-003 · spec-drift · → TheFixer → requirements-reviewer
**Specifications/dev-workflow-platform.md orphaned — 74 FRs unimplemented**  
File: `Specifications/dev-workflow-platform.md:341`  
Fix: Mark SUPERSEDED or add `[PLANNED - not yet built in Source/]` header; extend traceability enforcer to cover or explicitly exclude it.

#### QO-004 · spec-drift/pattern-violation · → TheFixer
**Traceability enforcer never scans FR-dependency-* plan — CI blind spot**  
File: `tools/traceability-enforcer.py`  
Fix: Extend enforcer to accept multiple plan files; add second CI pass for `Plans/dependency-linking/requirements.md`.

#### DA-006 · dependency/dos · → TheFixer
**DoS vulnerabilities: browserslist (OOM), brace-expansion (hang)**  
Fix: `npm audit fix` across all projects

#### DA-007 · dependency/injection · → TheFixer
**body-parser size-enforcement bypass (CWE-770) + form-data CRLF injection**  
Fix: `npm audit fix`; verify request size limits in middleware

#### DA-008 · dependency/info-disclosure · → TheFixer
**@babel/core arbitrary file read via sourceMappingURL**  
Fix: `npm audit fix` (updates @babel/core)

---

### P3 — Medium

| ID | Title | File | Fix |
|----|-------|------|-----|
| QO-005 | api/client.ts silently swallows JSON parse failure | `Source/Frontend/src/api/client.ts:26` | Add explanatory comment per CLAUDE.md silent-catch rule |
| QO-006 | 2 eslint-disable suppressions without rationale | `hooks/useWorkItems.ts:63`, `DependencyPicker.tsx:82` | Add one-line comment explaining why dep is intentionally omitted |
| DA-009 | Outdated major versions: pino (2 majors), uuid (3+ majors) | `Source/Backend/package.json` | Plan upgrades: pino@^10, uuid@^14 |
| DA-010 | License compliance audit not completed | All package.json files | `npm install -g license-checker && license-checker --json` |

---

### P4 — Low

| ID | Title | File | Fix |
|----|-------|------|-----|
| QO-007 | DebugPortalPage Verifies comment not a valid FR reference | `Source/Frontend/src/pages/DebugPortalPage.tsx:1` | Replace with `FR-WF-XXX` or note `// No FR — dev tooling only` |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| tinypool prototype pollution in vitest workers | DA-001, DA-005 | `npm install vitest@^3.2.6` in 2 projects |
| Outdated express transitive chain | DA-002, DA-007 | `npm install express@^4.20.0` in 4 projects |
| Incomplete dependency-linking plan | QO-001, QO-004 | Implement search.ts + extend enforcer |
| Traceability enforcer single-plan limitation | QO-003, QO-004 | Extend enforcer to multi-plan + clarify orphaned spec |
| npm audit fix sweep | DA-006, DA-007, DA-008 | Single `npm audit fix` pass across all projects |

---

## Prioritised Actions

**🛑 Block Deployment:**
1. `npm install vitest@^3.2.6 --save-dev` → Source/Frontend, portal/Backend (DA-001, DA-005)
2. `npm install express@^4.20.0` → all 4 Express projects (DA-002)
3. `npm install protobufjs@>=7.6.0` → platform/orchestrator, portal/Backend (DA-003)
4. `npm audit fix` in Source/Backend → handlebars (DA-004)
5. Trigger TheGuardians to confirm remediation before merge

**🔥 This Sprint:**
- Implement GET /api/search route and wire into app.ts (QO-001)
- Extend traceability enforcer to scan FR-dependency-* plan (QO-004)
- Run `npm audit fix` sweep across all projects (DA-006, DA-007, DA-008)

**📅 Next Sprint:**
- Extract workItemService.ts, fix service-layer bypass (QO-002)
- Clarify dev-workflow-platform.md status (QO-003)
- Plan pino + uuid major upgrades (DA-009)

**📋 Backlog:**
- Document silent-catch rationale in api/client.ts (QO-005)
- Document eslint-disable rationale (QO-006)
- Fix DebugPortalPage Verifies comment (QO-007)
- Run full license audit (DA-010)
- Add Dependabot + pre-commit `npm audit --audit-level=moderate` hook

---

## Prior Audit Comparison

First audit — no baseline. All 17 findings are NEW. This report becomes the baseline for 2026-11-16.

---

## Reports Generated

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-11-09-D.html` | Full HTML report (16 sections, risk matrix, all findings) |
| `Teams/TheInspector/findings/bug-backlog-2026-11-09.json` | Bug backlog JSON (TheFixer queue + TheGuardians escalations array) |
| `inspector-report.md` | This document |

---

## JSON Bug Backlog

```json
{
  "audit_id": "run-20261109-093415",
  "audit_date": "2026-11-09",
  "grade": "D",
  "escalations": [
    { "id": "DA-001", "severity": "P1", "cvss": 9.8, "title": "vitest <3.2.6 — RCE via Prototype Pollution", "trigger": "injection", "route": "[ESCALATE → TheGuardians]", "fix": "npm install vitest@^3.2.6 --save-dev (Source/Frontend, portal/Backend)" },
    { "id": "DA-002", "severity": "P1", "cvss": 9.1, "title": "proxy-addr <2.0.8 — IP Spoofing, access control bypass", "trigger": "missing access control", "route": "[ESCALATE → TheGuardians]", "fix": "npm install express@^4.20.0 (4 projects)" },
    { "id": "DA-003", "severity": "P1", "cvss": null, "title": "protobufjs ≤7.5.5 — 12 CVEs: Code Execution + DoS", "trigger": "injection", "route": "[ESCALATE → TheGuardians]", "fix": "npm install protobufjs@>=7.6.0 (orchestrator, portal/Backend)" },
    { "id": "DA-004", "severity": "P1", "cvss": 8.1, "title": "handlebars ≤4.7.8 — Template Injection / RCE (11 CVEs)", "trigger": "injection", "route": "[ESCALATE → TheGuardians]", "fix": "npm audit fix (Source/Backend)" },
    { "id": "DA-005", "severity": "P1", "cvss": null, "title": "tinypool ≤2.1.0 — Prototype Pollution RCE (via vitest)", "trigger": "injection", "route": "[ESCALATE → TheGuardians]", "fix": "Update vitest@^3.2.6 (same fix as DA-001)" }
  ],
  "findings": [
    { "id": "QO-001", "severity": "P1", "title": "GET /api/search not wired — 5 tests failing", "route": "TheFixer", "status": "NEW" },
    { "id": "QO-002", "severity": "P2", "title": "3 route files bypass service layer", "route": "TheFixer", "status": "NEW" },
    { "id": "QO-003", "severity": "P2", "title": "dev-workflow-platform.md orphaned — 74 FRs", "route": "TheFixer → requirements-reviewer", "status": "NEW" },
    { "id": "QO-004", "severity": "P2", "title": "Traceability enforcer blind spot (FR-dependency-* plan)", "route": "TheFixer", "status": "NEW" },
    { "id": "DA-006", "severity": "P2", "title": "DoS: browserslist OOM + brace-expansion hang", "route": "TheFixer", "status": "NEW" },
    { "id": "DA-007", "severity": "P2", "title": "body-parser size bypass + form-data CRLF injection", "route": "TheFixer", "status": "NEW" },
    { "id": "DA-008", "severity": "P2", "title": "@babel/core arbitrary file read via sourceMappingURL", "route": "TheFixer", "status": "NEW" },
    { "id": "QO-005", "severity": "P3", "title": "api/client.ts silent JSON catch (no comment)", "route": "TheFixer", "status": "NEW" },
    { "id": "QO-006", "severity": "P3", "title": "2 eslint-disable suppressions without rationale", "route": "TheFixer", "status": "NEW" },
    { "id": "DA-009", "severity": "P3", "title": "Outdated majors: pino (2+), uuid (3+)", "route": "TheFixer", "status": "NEW" },
    { "id": "DA-010", "severity": "P3", "title": "License compliance audit incomplete", "route": "TheFixer", "status": "NEW" },
    { "id": "QO-007", "severity": "P4", "title": "DebugPortalPage Verifies comment not a valid FR ref", "route": "TheFixer", "status": "NEW" }
  ],
  "summary": {
    "p1_total": 6, "p1_escalated": 5, "p1_fixer": 1,
    "p2_total": 6, "p3_total": 4, "p4_total": 1,
    "total_findings": 17
  }
}
```

---

*Generated by TheInspector team-leader · 2026-11-09*  
*Next audit: 2026-11-16 · Bring services up for performance-profiler + chaos-monkey dynamic mode*
