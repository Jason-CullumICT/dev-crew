# Dependency Audit — Findings Index
**Audit Date**: 2026-07-07  
**Total Findings**: 94 vulnerabilities + 25 outdated packages

---

## Quick Navigation

- **[Full Report](dependency-audit-2026-07-07.md)** — Detailed analysis with remediation
- **[Action Plan](REMEDIATION-ACTION-PLAN.md)** — Step-by-step fix instructions
- **[Summary](DEPENDENCY-AUDIT-SUMMARY.txt)** — Executive overview
- **[JSON Data](../../dependency-auditor-report.json)** — Machine-readable findings

---

## Findings by Severity

### 🔴 CRITICAL (P1) — 6 Findings
| ID | Package | Location | CVSS | Title |
|---|---------|----------|------|-------|
| DEP-CRIT-001 | vitest | Source/Frontend, portal/Backend | 9.8 | Arbitrary File Read & Execution |
| DEP-CRIT-002 | handlebars | Source/Backend (transitive) | 8.1–9.8 | JavaScript Injection (7 CVEs) |
| DEP-CRIT-003 | protobufjs | platform/orchestrator, portal/Backend (transitive) | 5.3–9.8 | Arbitrary Code Execution (11 CVEs) |

### 🟠 HIGH (P2) — 16 Findings
| ID | Package | Location | CVSS | Title |
|---|---------|----------|------|-------|
| DEP-HIGH-001 | vite | Source/Frontend, portal/Frontend | 0–6.2 | Path Traversal & FS Bypass |
| DEP-HIGH-002 | @opentelemetry/auto-instrumentations-node | portal/Backend | 7.5 | Prometheus DoS Crash |
| DEP-HIGH-003 | uuid | Source/Backend, platform/orchestrator | 7.5 | ID Generation CVE |

### 🟡 MODERATE (P3) — 27 Findings

**Direct Dependencies with CVEs:**
- uuid (Source/Backend) — Crypto flaw
- react-router-dom (Source/Frontend) — Path handling
- qs (transitive via express) — Prototype pollution
- body-parser (transitive) — Parsing issues

**Major Version Gaps (>1 major behind):**
- express (4→5) — Source/Backend, platform/orchestrator, portal/Backend
- pino (8→10) — Source/Backend
- react (18→19) — Source/Frontend, portal/Frontend
- react-dom (18→19) — Source/Frontend, portal/Frontend
- react-router-dom (6→7) — Source/Frontend, portal/Frontend
- dockerode (4→5) — platform/orchestrator
- multer (1→2) — Source/Backend

### 🔵 LOW (P4) — 21 Findings

Low-severity informational findings, minor version gaps, etc.

---

## Findings by Manifest

### Source/Backend
```
📊 12 vulnerabilities (1 CRITICAL, 2 HIGH, 9 MODERATE)
📦 18 direct dependencies
🔴 Status: CRITICAL
```
**Critical Issues:**
- Handlebars (transitive) — JavaScript injection
- UUID CVE in current version

**Major Upgrades Needed:**
- uuid (9→14)
- pino (8→10)
- express (4→5)
- multer (1→2)
- body-parser (1→1.20.x)

---

### Source/Frontend
```
📊 8 vulnerabilities (3 CRITICAL, 2 HIGH, 3 MODERATE)
📦 12 direct dependencies
🟡 Status: HIGH
```
**Critical Issues:**
- Vitest (9.8) — Arbitrary file read
- Vite (0–6.2) — Path traversal

**Major Upgrades Needed:**
- react (18→19)
- react-dom (18→19)
- react-router-dom (6→7)

---

### Source/E2E
```
📊 0 vulnerabilities
📦 5 direct dependencies
✅ Status: CLEAN
```
No action needed.

---

### platform/orchestrator
```
📊 14 vulnerabilities (2 CRITICAL, 3 HIGH, 9 MODERATE)
📦 16 direct dependencies
🔴 Status: CRITICAL
```
**Critical Issues:**
- Protobufjs (transitive via @grpc/grpc-js) — RCE
- UUID CVE in current version

**Major Upgrades Needed:**
- uuid (9→14)
- @grpc/grpc-js (update for protobufjs)
- dockerode (4→5)

---

### portal/Backend
```
📊 54 vulnerabilities (2 CRITICAL, 6 HIGH, 46 MODERATE)
📦 18 direct dependencies
🔴 Status: CRITICAL ← HIGHEST RISK MANIFEST
```
**Critical Issues:**
- Protobufjs (transitive via @grpc/grpc-js) — RCE
- Vitest (9.8) — Arbitrary file read
- @opentelemetry/auto-instrumentations-node (7.5) — DoS

**Major Upgrades Needed:**
- @opentelemetry/auto-instrumentations-node (0.40→0.78)
- @opentelemetry/api (various)
- express (4→5)
- multer (1→2)

---

### portal/Frontend
```
📊 6 vulnerabilities (0 CRITICAL, 3 HIGH, 3 MODERATE)
📦 10 direct dependencies
🟡 Status: HIGH
```
**Issues:**
- Vite (0–6.2) — Path traversal

**Major Upgrades Needed:**
- react (18→19)
- react-dom (18→19)
- react-router-dom (6→7)

---

## Cross-References

### [CROSS-REF: TheGuardians] Security Team
These findings require security validation:
- Protobufjs RCE exploitability in gRPC communication paths
- Handlebars injection risk in template rendering
- UUID ID generation impact on work-item security
- Vite path traversal impact on development environment

### [CROSS-REF: TheFixer] Bug/Fix Team
These require migration planning:
- React 18→19 breaking changes
- Express 4→5 API migration
- Pino 8→10 logging API changes
- Dockerode 4→5 Docker API changes

### [CROSS-REF: Quality-Oracle] QA/Testing
These require integration testing:
- All Phase 1 dependency updates
- React ecosystem upgrade validation
- gRPC communication after protobufjs update
- Prometheus metrics endpoint after @opentelemetry update

---

## Remediation Summary

### Phase 1 (TODAY)
**6 CRITICAL + 3 HIGH CVEs eliminated in 1 hour**
```bash
npm update vitest vite @grpc/grpc-js uuid @opentelemetry/auto-instrumentations-node
# Trace and update handlebars chain
```

### Phase 2 (This Week)
**Remaining HIGH + MODERATE CVEs in 4–8 hours**
- Complete @opentelemetry updates
- Test all Phase 1 changes

### Phase 3 (Sprint)
**Major version migrations over 2–4 days**
- React ecosystem (18→19)
- Express (4→5)
- Pino (8→10)

---

## Metrics Dashboard

| Metric | Value | Trend |
|--------|-------|-------|
| Total Vulnerabilities | 94 | 🔴 HIGH |
| Critical CVEs | 6 | 🔴 CRITICAL |
| High CVEs | 16 | 🟠 HIGH |
| Outdated Packages | 25 | 🟡 ATTENTION |
| Manifests Clean | 1/6 | 🔵 LOW |
| Time to Patch (P1) | 1 hour | 🟢 ACCEPTABLE |

---

## Files Generated

```
Teams/TheInspector/findings/
├── dependency-audit-2026-07-07.md    ← Full detailed report
├── REMEDIATION-ACTION-PLAN.md        ← Step-by-step fixes
├── DEPENDENCY-AUDIT-SUMMARY.txt      ← Executive summary
├── FINDINGS-INDEX.md                 ← This file
└── ../learnings/
    └── dependency-auditor.md          ← Persistent learnings

/home/runner/work/dev-crew/dev-crew/
└── dependency-auditor-report.json     ← Machine-readable JSON (19 KB)
```

---

## Key Takeaways

1. **Immediate Risk**: 6 CRITICAL CVEs require emergency patches TODAY
2. **Main Risk Area**: portal/Backend has 54 vulnerabilities — prioritize first
3. **Transitive Risks**: Protobufjs (gRPC) and handlebars are hidden attack surfaces
4. **Tech Debt**: Multiple packages 5+ major versions behind (uuid, OpenTelemetry)
5. **Automation Opportunity**: Implement Dependabot for continuous dependency updates

---

**Audit Date**: 2026-07-07  
**Auditor**: TheInspector / Dependency Auditor  
**Report Version**: 1.0
