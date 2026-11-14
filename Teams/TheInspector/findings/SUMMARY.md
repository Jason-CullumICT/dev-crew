# Dependency Audit — Executive Summary
**Date:** 2026-11-14  
**Grade:** D (16 Critical CVEs)  
**Risk Level:** SEVERE

---

## Quick Facts

| Metric | Value |
|--------|-------|
| Projects Scanned | 6 npm projects |
| Total Dependencies | 1,621 transitive |
| **Critical CVEs** | **16** ⚠️ |
| High CVEs | 34 |
| Moderate CVEs | 67 |
| Low CVEs | 10 |
| **Total Vulnerabilities** | **123** |

---

## Critical Issues (Immediate Action Required)

### 🔴 protobufjs — 12 Critical Exploits (Code Injection / RCE / DoS)
- **Affects:** portal/Backend, platform/orchestrator
- **Impact:** Code execution, DoS, prototype pollution
- **Fix:** Update `@grpc/grpc-js` to ≥1.14.5 (1-2 hours)
- **Escalate to:** TheGuardians

### 🔴 Handlebars.js — 8 Critical Template Injection Exploits
- **Affects:** Source/Backend (transitive from test tools)
- **Impact:** Template injection → arbitrary code execution
- **Status:** Likely build-time only; **VERIFY runtime usage** 
- **Fix:** Update handlebars; verify no runtime template processing (1 hour)
- **Escalate to:** TheGuardians

### 🔴 Tinypool — 2 Critical RCE Exploits (Prototype Pollution)
- **Affects:** Source/Frontend, portal/Backend (via vitest)
- **Impact:** Remote code execution in worker threads
- **Fix:** Update `vitest` to ≥2.1.0+ (1 hour)

### 🔴 proxy-addr — IPv4-Mapped IPv6 IP Spoofing
- **Affects:** Source/Backend, platform/orchestrator, portal/Backend (all express projects)
- **Impact:** Bypass IP-based access control; spoofing attacks
- **Problem:** `/api/metrics` endpoint may be exploitable if it trusts IPs only
- **Fix:** Implement credential-based auth (API keys/JWT) for sensitive endpoints (3 hours)
- **Escalate to:** TheGuardians

### 🔴 @grpc/grpc-js — 3 Critical Exploits (Server Crash / Certificate Bypass)
- **Affects:** platform/orchestrator, portal/Backend
- **Impact:** DoS via malformed gRPC; certificate validation bypass (critical for mTLS)
- **Fix:** Update to ≥1.14.5; test mTLS validation (2 hours)
- **Escalate to:** TheGuardians

### 🔴 Vitest UI — Arbitrary File Read
- **Affects:** Source/Frontend, portal/Backend (dev dependencies)
- **Impact:** Source code exfiltration if UI server is exposed
- **Status:** Low risk if UI only runs locally; **verify it's not exposed in CI/production**
- **Fix:** Disable UI server if unused; restrict network access (30 min)

---

## High-Severity Issues (Week 2-3)

| Package | Project | Issue | Fix |
|---------|---------|-------|-----|
| body-parser | All express projects | Invalid limit DoS | Verify size limits; update |
| brace-expansion | Source/Backend | Zero-step sequence hang | Update |
| browserslist | Frontend, Backend | Unbounded OOM | Update; monitor memory |
| form-data | Source/Backend | CRLF injection in headers | Sanitize field names; update |
| js-yaml | Source/Backend | Quadratic DoS in merge keys | Validate YAML structure; update |
| react-router | Source/Frontend | Open redirect via `//` URLs | Update to ≥6.26.0; audit redirects |

---

## Project Risk Ranking

| Project | Risk | Issues | Primary Concern |
|---------|------|--------|-----------------|
| **portal/Backend** | 🔴 HIGH | 61 CVEs (4 critical) | OpenTelemetry instrumentation bloat (577 deps); protobufjs chain |
| **Source/Backend** | 🟠 MEDIUM | 18 CVEs (2 critical) | Handlebars (likely build-time); body-parser |
| **Source/Frontend** | 🟠 MEDIUM | 17 CVEs (2 critical) | Tinypool/vitest RCE; react-router open redirect |
| **Orchestrator** | 🟠 MEDIUM | 9 CVEs (2 critical) | grpc-js; protobufjs; proxy-addr |
| **portal/Frontend** | 🟠 MEDIUM | 18 CVEs (2 critical) | Tinypool/vitest |
| **Source/E2E** | 🟢 LOW | 0 CVEs | ✅ None — minimal dependencies |

---

## Remediation Timeline

### Week 1 (Immediate) — Fix P1 Critical Issues
**Effort:** ~10 hours

```
[ ] 1. Update @grpc/grpc-js to ≥1.14.5 (2 hrs)
       cd portal/Backend && npm update @grpc/grpc-js
       
[ ] 2. Verify Handlebars no runtime usage; update (1 hr)
       cd Source/Backend && npm audit fix --force
       
[ ] 3. Update vitest to ≥2.1.0+ (1 hr)
       cd Source/Frontend && npm update vitest
       cd portal/Backend && npm update vitest
       
[ ] 4. Verify vitest UI is not exposed (30 min)
       Check CI configs, disable if unused
       
[ ] 5. Implement credential-based auth for /metrics endpoint (3 hrs)
       Add JWT/API key check to middleware
       
[ ] 6. Test mTLS validation (2 hrs)
       After grpc-js update, run integration tests
```

**Verification:**
```bash
npm audit --fail-on=high
# Should show 0 critical, 0 high
```

### Week 2-3 (High Priority) — Fix P2 Issues
**Effort:** ~9 hours

```
[ ] Update body-parser, brace-expansion, browserslist, form-data, js-yaml
[ ] Audit and update react-router-dom
[ ] Add configuration validation for YAML processing
```

### Month 2+ (Deferred) — P3/P4 Issues
```
[ ] Audit UUID usage in security-sensitive contexts
[ ] Update @babel/core
[ ] Monitor for new vulnerabilities
```

---

## Supply Chain Risk Assessment

### ⚠️ portal/Backend — 577 Dependencies (HIGH RISK)
**Problem:** OpenTelemetry auto-instrumentation pulls in massive dependency tree, including protobufjs with 12 critical CVEs.

**Recommendation:**
1. Audit whether all instrumentation is necessary
2. Consider lightweight alternative (e.g., Jaeger client without auto-instrumentation)
3. Remove instrumentations for non-critical components

### ⚠️ Source/Backend — 407 Dependencies (MEDIUM RISK)
**Problem:** Handlebars transitive dependency; body-parser/form-data vulnerabilities.

**Recommendation:**
1. Verify Handlebars is only used at build time
2. Consider removing if not needed
3. Keep express dependencies up-to-date

### ⚠️ Source/Frontend — 230 Dependencies (MEDIUM RISK)
**Problem:** Vitest/tinypool introduce RCE gadgets; react-router open redirect.

**Recommendation:**
1. Ensure vitest runs ONLY in isolated dev/CI environments
2. Never expose vitest UI to untrusted users
3. Audit all react-router redirects

---

## CI/CD Integration

### Add to Build Pipeline

```bash
# Fail on critical/high vulnerabilities
npm audit --fail-on=high

# Monthly full audit report
npm audit > audit-report.json

# Lock file validation
npm ci  # Use instead of npm install in CI
```

### Add to .github/workflows/ci.yml
```yaml
- name: Security Audit
  run: npm audit --fail-on=high --workspaces
```

---

## Cross-Team Escalations

### 🎯 TheGuardians (Security Team)
**Required Actions:**
1. Assess protobufjs RCE exploitability in orchestrator
2. Verify Handlebars is not processing untrusted templates at runtime
3. Audit `/api/metrics` endpoint for IP-spoofing attacks (proxy-addr)
4. Verify mTLS certificate validation after grpc-js update
5. Review UUID usage in authentication/authorization code

### 🎯 TheFixer (Development Team)
**Required Actions:**
1. Execute remediation plan (update all dependencies)
2. Implement credential-based auth for sensitive endpoints
3. Add npm audit gates to CI/CD
4. Document OpenTelemetry cost-benefit analysis (577 deps for what value?)

---

## Key Takeaways

| Finding | Action | Owner | Effort |
|---------|--------|-------|--------|
| **16 Critical CVEs** | Update dependencies & verify fixes | TheFixer | 10 hrs |
| **IP spoofing risk** | Add credential-based auth | TheFixer + TheGuardians | 3 hrs |
| **protobufjs RCE chain** | Evaluate OpenTelemetry necessity | TheGuardians | 4 hrs |
| **vitest RCE gadgets** | Ensure isolated from production | TheFixer | 1 hr |
| **No GPL dependencies** | ✅ License compliance OK | — | — |

---

## Reports Generated

1. **audit-2026-11-14.md** — Detailed technical findings (17 KB)
2. **audit-2026-11-14.json** — Structured data for tooling (15 KB)
3. **SUMMARY.md** — This executive summary
4. **dependency-auditor.md** — Learnings for future audits

---

**Audit completed by:** dependency_auditor (Haiku 4.5)  
**Overall Health:** Grade D — **Requires immediate action on 16 critical CVEs**
