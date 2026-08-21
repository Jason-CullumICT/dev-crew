# Dependency Audit Report — dev-crew
**Audit Date:** 2026-08-21  
**Auditor:** dependency_auditor (Haiku)  
**Status:** ⚠️ **CRITICAL ISSUES FOUND**

---

## Executive Summary

A comprehensive dependency audit of the **dev-crew** project identified **28 vulnerabilities** across npm packages:

| Severity | Count | Status |
|----------|-------|--------|
| **Critical (P1)** | 3 | ⛔ Requires immediate action |
| **High (P2)** | 9 | 🔴 Fix this sprint |
| **Moderate** | 12 | 🟠 Fix next sprint |
| **Low** | 4 | 🟡 Monitor |

**License Compliance:** ✅ PASSED (No GPL/AGPL violations)  
**Supply Chain Risk:** 🔴 HIGH (200+ transitive deps in Frontend)  

---

## Critical Issues (P1) — IMMEDIATE ACTION REQUIRED

### 1. Handlebars RCE (Backend)
- **Package:** handlebars (indirect)
- **Severity:** CRITICAL (CVSS 9.8)
- **Issue:** Arbitrary code execution via AST type confusion
- **Affected:** Templates can be exploited for code injection
- **Fix:** `npm update handlebars@>=4.7.8`
- **Escalation:** ✅ [TheGuardians] — Code injection severity

### 2. Vitest Bundler Vulnerabilities (Frontend)  
- **Package:** vitest@2.0.5 (direct devDependency)
- **Severity:** CRITICAL (CVSS 9.8)
- **Issue:** Multiple vulnerabilities in esbuild, postcss, nanoid transitive chain
- **Affected:** Test execution could trigger code execution
- **Fix:** `npm update vitest@latest` (>=4.1.0)
- **Escalation:** ✅ [TheGuardians] — Code execution in test environment

### 3. Vite Dev Server Escape (Frontend)
- **Package:** vite@5.4.0 (direct devDependency)
- **Severity:** HIGH (CVSS 7.5)
- **Issue:** esbuild vulnerabilities allow reading arbitrary files from dev server
- **Affected:** Developers and CI/CD pipelines
- **Fix:** `npm update vite@latest` (>=8.2.2)
- **Escalation:** ✅ [TheGuardians] — Information disclosure in development

### 4. Protobufjs RCE (Orchestrator)
- **Package:** protobufjs (indirect, via @grpc/grpc-js)
- **Severity:** CRITICAL (CVSS 9.8)
- **Issue:** 12 CVEs including arbitrary code execution, prototype pollution
- **Affected:** Orchestrator gRPC communication
- **Fix:** Upgrade @grpc/grpc-js to latest OR migrate from protobufjs
- **Escalation:** ✅ [TheGuardians] — Critical RCE in infrastructure

---

## High Severity Issues (P2) — FIX THIS SPRINT

| Package | Issue | CVSS | Module | Fix |
|---------|-------|------|--------|-----|
| brace-expansion | DoS via unbounded expansion | 7.5 | Backend | >=1.1.18 |
| form-data | CRLF injection in multipart fields | 7.5 | Backend | >=4.0.6 |
| js-yaml | Code injection via unsafe YAML parsing | 7.5 | Backend | latest |
| nanoid | Infinite loop / DoS | 5.9 | Frontend | >=3.3.16 |
| postcss | Multiple (DoS, template injection) | 7.5 | Frontend | latest |
| ws | WebSocket info disclosure | 7.5 | Frontend | latest |
| @grpc/grpc-js | Server crash on malformed requests | 7.5 | Orchestrator | >=1.14.4 |
| path-to-regexp | ReDoS via route parameters | 7.5 | Orchestrator | >=0.1.13 |

---

## Outdated Dependencies (P3) — PLAN FOR NEXT SPRINT

### Backend (Source/Backend)
```
express:     4.18.2 → 4.22.2 (3 minor versions behind)
pino:        8.17.0 → 8.21.0 (4 patch versions behind)
uuid:        9.0.0 → 9.0.1 (1 patch version behind)
```

### Frontend (Source/Frontend)
```
react:              18.3.1 → 19.2.8 (1 major version behind)
react-dom:          18.3.1 → 19.2.8 (1 major version behind)
react-router-dom:   6.26.0 → 6.30.6 (4 minor versions behind)
```

---

## Dependency Statistics

| Module | Direct | Transitive | Vulnerabilities | Risk |
|--------|--------|-----------|-----------------|------|
| Backend | 4 | 50 | 9 (1 critical) | Medium |
| Frontend | 3 | 200 | 13 (1 critical) | **HIGH** |
| E2E | 1 | 50 | 0 | Low |
| Orchestrator | 3 | 155 | 3 (1 critical) | **HIGH** |

**Key Observation:** Frontend build tools (vite, vitest) create a high-risk transitive dependency tree (200+ packages).

---

## Direct Dependencies Analysis

### Direct Deps with Issues

| Package | Type | Version | Severity | Reason |
|---------|------|---------|----------|--------|
| **vitest** | devDep (Frontend) | 2.0.5 | CRITICAL | Bundler vulnerabilities in esbuild, postcss |
| **vite** | devDep (Frontend) | 5.4.0 | HIGH | Dev server escape (esbuild vulns) |
| **express** | dep (Backend/Orch) | 4.18.2 / 4.21.0 | MODERATE | qs vulnerability in transitive |
| **react-router-dom** | dep (Frontend) | 6.26.0 | MODERATE | @remix-run/router: open redirect |
| **uuid** | dep (Backend) | 9.0.0 | MODERATE | Indirect dependency affecting audit |
| **dockerode** | dep (Orchestrator) | 4.0.4 | MODERATE | uuid vulnerability |

**No direct GPL/AGPL dependencies detected.** License compliance: ✅ PASSED

---

## Supply Chain Risk Assessment

### Risk Factors
- **200+ transitive dependencies** in Frontend (highest surface area)
- **Build tools with vulnerabilities** (vite, vitest, esbuild, postcss)
- **gRPC ecosystem** with critical protobufjs RCE
- **Multiple minor versions outdated** across all modules

### Risk Vectors
1. **Build-time RCE** via vite/vitest during development/CI
2. **Runtime RCE** via handlebars template injection
3. **Infrastructure RCE** via protobufjs in orchestrator
4. **DoS attacks** via brace-expansion, nanoid infinite loops
5. **Information disclosure** via vite dev server, ws WebSocket

---

## Remediation Roadmap

### Phase 1: CRITICAL (This Week)
```bash
# Backend
cd Source/Backend
npm update handlebars@latest

# Frontend
cd Source/Frontend
npm update vitest@latest vite@latest

# Orchestrator
cd platform/orchestrator
npm update @grpc/grpc-js@latest dockerode@latest
```

### Phase 2: HIGH (This Sprint)
```bash
# All modules
npm update --workspaces brace-expansion form-data js-yaml nanoid postcss ws path-to-regexp
```

### Phase 3: MEDIUM (Next Sprint)
```bash
# Backend
npm update express pino uuid

# Frontend
npm update react react-dom react-router-dom
```

---

## Cross-Team Escalation

### Escalated to TheGuardians
**Severity:** CRITICAL  
**Reason:** Code injection and RCE vulnerabilities require security team review

**Issues Escalated:**
- DEP-001: handlebars RCE (CVSS 9.8)
- DEP-002: vitest bundler RCE (CVSS 9.8)
- DEP-003: vite dev server escape (CVSS 7.5)
- DEP-004: protobufjs RCE (CVSS 9.8)

**Action Required:** TheGuardians to verify exploitability and advise on prioritization.

---

## Recommendations

### Immediate (P1)
1. **Update vitest and vite** — prevents dev-time RCE
2. **Update handlebars** — prevents template injection RCE
3. **Resolve protobufjs** — prevents orchestrator RCE

### This Sprint (P2)
4. **Batch update high-severity transitive deps** — brace-expansion, form-data, etc.
5. **Test all updates thoroughly** — especially major version jumps

### Next Sprint (P3)
6. **Plan React 19 migration** — when ready
7. **Plan Express 5.0 upgrade** — when needed
8. **Reduce transitive dependency count** — consider webpack/esbuild directly vs vite wrapper

### Ongoing
9. **Monitor npm registry** for new CVEs in known-vulnerable packages (handlebars, protobufjs)
10. **Schedule regular audits** (monthly recommended)
11. **Maintain dependency version policy** — when to update, when to hold

---

## Files Generated

- `Teams/TheInspector/findings/dependency-audit-findings.json` — Structured findings (JSON)
- `Teams/TheInspector/findings/DEPENDENCY-AUDIT-REPORT.md` — This report
- `Teams/TheInspector/learnings/dependency-auditor.md` — Persistent learnings updated

---

## Audit Methodology

**Tools Used:**
- `npm audit --json` — CVE detection
- `npm outdated --json` — Version staleness
- `npm ls` — Dependency tree inspection
- `npx license-checker` — License compliance

**Scope:**
- Audited main application modules: Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator
- Excluded demo projects and portal modules (separate audit scope)
- All npm workspaces included

**Confidence:**
- npm audit data: ✅ Complete (npm registry)
- License data: ✅ Complete (license-checker)
- Outdated versions: ✅ Complete (npm registry)

---

## Next Steps

1. **TheGuardians review** → Confirm exploitability of P1 issues
2. **Backend team** → Update handlebars, brace-expansion, form-data, js-yaml
3. **Frontend team** → Update vitest, vite, nanoid, postcss, ws
4. **Orchestrator team** → Resolve protobufjs / update @grpc/grpc-js
5. **All teams** → Run `npm test` and verify zero new failures after updates
6. **Re-run audit** → Confirm all P1/P2 issues resolved

---

**Report Generated:** 2026-08-21  
**Next Audit Scheduled:** Recommended in 30 days or after major dependency updates
