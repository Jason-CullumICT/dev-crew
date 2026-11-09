# Dependency Auditor Learnings

**Last Updated:** 2026-11-09
**Run:** Initial audit of dev-crew repository

## Audit Scope
- Repository: dev-crew (AI-powered development platform)
- Package Managers: npm (6 workspace projects)
- Projects Scanned:
  - Source/Backend (411 dependencies)
  - Source/Frontend (230 dependencies)
  - Source/E2E (5 dependencies) ✅ CLEAN
  - platform/orchestrator (155 dependencies)
  - portal/Backend (577 dependencies) ⚠️ HIGHEST RISK
  - portal/Frontend (424 dependencies)

## Critical Findings (P1)

### High-Impact Vulnerabilities Discovered

#### 1. vitest (9.8 CVSS - RCE)
- **Status:** DIRECT dependency in Source/Frontend & portal/Backend
- **Risk:** Remote Code Execution via prototype pollution in tinypool
- **Affected Versions:** <1.0.5, >=1.1.0 <3.2.6
- **Fix:** Update to vitest@^3.2.6
- **Priority:** URGENT - affects CI/CD pipelines

#### 2. protobufjs (12 distinct CVEs)
- **Status:** Transitive in platform/orchestrator & portal/Backend
- **Risk:** Code execution, DoS, prototype pollution
- **Affected Versions:** <=7.5.5
- **Fix:** Upgrade to protobufjs@>=7.6.0 or >=8.0.0
- **Watch:** Used in infrastructure and observability chains

#### 3. proxy-addr (9.1 CVSS - IP Spoofing)
- **Status:** Transitive (via express) in backend, frontend, orchestrator
- **Risk:** IPv4-mapped IPv6 address spoofing bypasses security checks
- **Affected Versions:** >=1.1.0 <2.0.8
- **Fix:** Upgrade express or proxy-addr@>=2.0.8
- **Watch:** Endemic to all express-based services

#### 4. handlebars (8.1 CVSS - JavaScript Injection)
- **Status:** Transitive in Source/Backend
- **Risk:** 11 distinct JavaScript injection CVEs via AST confusion
- **Affected Versions:** >=4.0.0 <=4.7.8
- **Fix:** Upgrade to handlebars@>4.7.8
- **Watch:** High recurring vulnerability

#### 5. tinypool (RCE)
- **Status:** Transitive (via vitest) in test frameworks
- **Risk:** Prototype pollution gadget leads to RCE
- **Fix:** Update vitest (which includes tinypool fix)

## Vulnerability Distribution

| Severity | Count | Key Packages |
|----------|-------|--------------|
| Critical | 12 unique packages | vitest, protobufjs, proxy-addr, handlebars, tinypool |
| High | 36 instances | DoS, injection, network vulns |
| Moderate | 106 instances | Various transitive deps |
| Low | 18 instances | Low-impact issues |

## Watch List for Future Audits

**High-Frequency Vulnerability Packages:**
- handlebars (11 distinct CVEs found)
- protobufjs (12 distinct CVEs found)
- vitest/tinypool (prototype pollution chain)
- @opentelemetry/* (chain has many transitive vulns)
- express ecosystem (proxy-addr recurring)

## Audit Status
- Report Date: 2026-11-09
- Next Recommended Audit: After fixes applied (2026-11-16)
- Estimated Fix Time: 2-3 hours for critical updates
