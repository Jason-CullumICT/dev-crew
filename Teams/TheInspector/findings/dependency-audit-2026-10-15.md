# Dependency Auditor Report
**Date:** 2026-10-15  
**Grade:** C (4 Critical, 40 High, 12 Moderate vulnerabilities)  
**Status:** ⚠️ ABOVE ACCEPTABLE THRESHOLD

---

## Executive Summary

The dev-crew project has **59 known CVEs** across npm dependencies, with **4 critical vulnerabilities** that require immediate remediation. The primary issues are:

1. **Vitest testing framework** (v2.0.5) — RCE via prototype pollution in tinypool
2. **Jest testing ecosystem** (v29.7.0) — 33 high-severity CVEs in transitive chain
3. **React Router v6** — Open redirect vulnerability via protocol-relative URLs
4. **Proxy-Addr** (via Express) — IP trust-list bypass (CVSS 9.1)

**Recommendation:** Perform dependency upgrades in priority order before production deployment.

---

## Scan Details

| Metric | Value |
|--------|-------|
| Projects Scanned | 3 (Backend, Frontend, E2E) |
| Package Manager | npm |
| Scan Date | 2026-10-15 07:17 UTC |
| Total CVEs Found | 59 |
| Direct Dependencies | 27 |
| Transitive Dependencies | ~34 |
| License Issues | 0 (Fully Compliant) |
| Abandoned Packages | 0 |

---

## Vulnerability Breakdown

```
Total CVEs by Severity:
┌─────────────┬───────┐
│ Critical    │   4   │ ◆◆◆◆
│ High        │  40   │ ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆ (majority from Jest ecosystem)
│ Moderate    │  12   │ ◆◆◆◆◆◆
│ Low         │   3   │ ◆◆
└─────────────┴───────┘
```

### By Project
| Project | Critical | High | Moderate | Low | Total |
|---------|----------|------|----------|-----|-------|
| Backend | 2 | 33 | 5 | 2 | 42 |
| Frontend | 2 | 7 | 7 | 1 | 17 |
| E2E | 0 | 0 | 0 | 0 | 0 |

---

## Critical Findings (P1) - MUST FIX

### 1. Vitest RCE via Tinypool Prototype Pollution
```
Package: vitest@^2.0.5 (direct in Frontend/package.json)
CVE: Tinypool prototype pollution → RCE
CVSS: 9.0 (Critical)
```
**Impact:** Attacker can inject code via worker thread options, leading to arbitrary code execution during testing.

**Affected:** Source/Frontend/package.json → vitest (direct)

**Transitive Chain:**
- vitest → tinypool (<3.0.0)
- vitest → @vitest/mocker (also has path traversal CVE)

**Remediation:**
```bash
cd Source/Frontend
npm update vitest@5.0.4
```

**Timeline:** Fix immediately — RCE vulnerability in testing pipeline

---

### 2. Jest Ecosystem CVE Cascade
```
Package: jest@^29.7.0 (direct in Backend/package.json)
CVEs: 33 high-severity in transitive packages
Root Cause: jest-message-util, micromatch, internal jest packages
```

**Affected Packages (13+):**
@jest/console, @jest/core, @jest/environment, @jest/expect, @jest/fake-timers, @jest/globals, @jest/reporters, @jest/test-result, @jest/test-sequencer, @jest/transform, jest-circus, jest-config, jest-haste-map, jest-message-util, jest-resolve, jest-runner, jest-runtime, jest-snapshot, jest-watcher

**Impact:** Test framework compromise could allow:
- CI/CD pipeline injection
- Test data exfiltration
- Build-time code execution

**Remediation:**
```bash
cd Source/Backend
npm update jest@30.5.2  # Major version bump required
npm test  # Validate test compatibility
```

**Timeline:** Fix immediately — 33 high-severity CVEs affecting all testing

---

### 3. Handlebars AST Type Confusion (RCE)
```
Package: handlebars (transitive, via jest ecosystem)
CVE: GHSA-3mfm-83xf-c92r
CVSS: 8.1 (Critical)
```

**Impact:** Attacker can inject arbitrary JavaScript by tampering with @partial-block in Handlebars AST.

**Remediation:** Resolved by upgrading jest (handlebars will be updated in dependency chain)

---

### 4. Proxy-Addr IPv4-Mapped IPv6 IP Spoofing
```
Package: proxy-addr (transitive, via Express)
CVE: GHSA-jqcg-44mw-7w3h
CVSS: 9.1 (Critical)
```

**Impact:** Attacker can bypass IP trust lists using IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1).

**Risk Context:** If the application uses Express `trust proxy` configuration and relies on IP-based access control, attacker can impersonate trusted proxies.

**Remediation:**
1. Audit Express configuration for `trust proxy` usage
2. Upgrade Express and related deps
3. Consider moving from IP-based to header-based trust validation

```bash
# Check current Express version
cd Source/Backend
npm ls express

# Upgrade to latest
npm update express
```

**Timeline:** Fix this sprint — impacts authentication if trust-proxy is enabled

---

## High-Severity Findings (P2)

### 5. React Router Open Redirect
```
Package: @remix-run/router@<1.23.3 (via react-router-dom)
CVE: GHSA-2j2x-hqr9-3h42
```

**Impact:** Attacker can craft redirect URLs starting with `//` that bypass same-origin checks and redirect to attacker-controlled sites (phishing vector).

**Remediation:**
```bash
cd Source/Frontend
npm update react-router-dom@7.18.4
npm test  # May require routing code changes
```

---

### 6. Vitest Path Traversal via Mocker
```
Package: @vitest/mocker@>=2.1.0 <4.1.11 (via vitest)
CVE: GHSA-82fw-gwwq-j7x9
CVSS: 5.9 (High)
```

**Impact:** Test mock system can be abused to read arbitrary files on disk.

**Remediation:** Resolved by vitest@5.0.4+ upgrade

---

### 7-39. Jest Transitive Chain (33 CVEs)
All resolved by jest@30.5.2+ upgrade.

---

## Moderate Findings (P3)

### 40. Babel Core Arbitrary File Read
```
Package: @babel/core <=7.29.0 (transitive)
CVE: GHSA-4x5r-pxfx-6jf8
CVSS: 3.2 (Low-Moderate)
```

**Impact:** Source mapping configuration can leak source files.

**Remediation:** Automatically updated when upgrading other dependencies.

---

## Outdated Packages

### React v18 → v19
| Property | Value |
|----------|-------|
| Current | 18.3.1 |
| Latest | 19.3.1 |
| Lag | 1 major version |
| Priority | P3 (Medium) |
| Timeline | Next sprint |

**Rationale:** React 19 has performance improvements; v18 still receives patches but is not latest stable.

### Jest v29 → v30
| Property | Value |
|----------|-------|
| Current | 29.7.0 |
| Latest | 30.5.2 |
| Lag | 1 major version |
| Priority | **P2 (Urgent)** |
| Timeline | Immediately |

**Rationale:** v30.5.2 fixes 33 high-severity CVEs; critical upgrade.

### React Router v6 → v7
| Property | Value |
|----------|-------|
| Current | 6.30.6 |
| Latest | 7.18.4 |
| Lag | 1 major version |
| Priority | **P2 (Urgent)** |
| Timeline | Immediately |

**Rationale:** v7.18.4 fixes open redirect CVE (GHSA-2j2x-hqr9-3h42).

---

## License Compliance

✅ **Status: FULLY COMPLIANT**

| License Type | Count | Status |
|--------------|-------|--------|
| MIT | 18 | ✅ |
| Apache 2.0 | 3 | ✅ |
| ISC | 2 | ✅ |
| BSD-3-Clause | 2 | ✅ |
| GPL/AGPL | 0 | ✅ |
| Unknown/Unlicensed | 0 | ✅ |

**Note:** All licenses are permissive; no viral or proprietary restrictions detected.

---

## Supply Chain Risk Assessment

### Healthy Signals ✅
- ✅ No post-install scripts detected
- ✅ All dependencies have >100k weekly downloads
- ✅ No single-maintainer critical packages
- ✅ No recently abandoned projects
- ✅ No deprecated flags
- ✅ No version conflicts across projects

### Transitive Dependency Tree
- Backend: 12 direct → ~15 transitive (reasonable)
- Frontend: 11 direct → ~15 transitive (reasonable)
- E2E: 4 direct → 0 vulnerable (minimal)

---

## Remediation Roadmap

### Phase 1: URGENT (This Week)
**Priority:** Fix RCE and 33 high CVEs before any production deployment

1. **Frontend:**
   ```bash
   cd Source/Frontend
   npm update vitest@5.0.4 react-router-dom@7.18.4
   npm test
   ```

2. **Backend:**
   ```bash
   cd Source/Backend
   npm update jest@30.5.2
   npm test
   ```

3. **Verify:** Run full test suite and deploy to staging

### Phase 2: HIGH (This Sprint)
**Priority:** Patch remaining critical issues

4. **Audit & Fix Proxy Configuration**
   - Review Source/Backend for `app.set('trust proxy', ...)`
   - If enabled: update Express or disable IP-based trust
   - Apply principle of least privilege

5. **Handlebars Update** (automatic via jest/dependency updates)

### Phase 3: MEDIUM (Next Sprint)
**Priority:** Complete remaining updates

6. **React v18 → v19**
   ```bash
   cd Source/Frontend
   npm update react@19.3.1 react-dom@19.3.1
   npm test
   ```

---

## Grading per inspector.config.yml

```
Current Grade: C
- Max P1 allowed: 0 (grading A)
- Current P1: 4 (vitest, tinypool, proxy-addr, handlebars)
- Max P2 allowed for B-grade: 8
- Current P2: 10 (jest, react-router, vitest-mocker, outdated packages)

Verdict: ABOVE THRESHOLD
```

**After Remediation:**
- Upgrade vitest@5.0.4 ✓
- Upgrade jest@30.5.2 ✓
- Upgrade react-router-dom@7.18.4 ✓
- Audit proxy-addr ✓
- **Projected Grade: B** (0 P1, ~2 P2 remaining)

---

## Cross-Team Escalations

### 🔴 TheGuardians (Security Team)
These findings require security team review and may need escalation to leadership:

1. **DEP-001 (Proxy-Addr CVSS 9.1):** Trust-proxy bypass in Express
   - Recommendation: Audit all IP-based access control
   - Escalation: If IP-based auth is critical path

2. **DEP-002 (Handlebars RCE CVSS 8.1):** Template injection risk
   - Recommendation: Audit template rendering

3. **DEP-003/004 (Vitest RCE):** Code execution in CI/CD
   - Recommendation: Isolate test environment from production secrets

4. **DEP-006 (React Router Open Redirect):** Phishing vector
   - Recommendation: Validate all redirect destinations

### 🔧 TheFixer (Quality/Development Team)
These require code changes and validation:

1. **Jest Upgrade Path:** v29→v30 major bump
   - May require test code updates
   - Must validate entire test suite

2. **React Router Upgrade:** v6→v7 major bump
   - May require routing code updates
   - Needs component testing

---

## Compliance Status

| Category | Status | Notes |
|----------|--------|-------|
| CVE Management | ⚠️ URGENT | 4 critical, 40 high — must remediate |
| License | ✅ PASS | All permissive licenses |
| Supply Chain | ✅ PASS | No abandoned/single-maintainer deps |
| Outdated | ⚠️ ACTION | 3 packages >1 major version behind |
| Overall Grade | **C** | Improves to **B** after Phase 1-2 remediation |

---

## Appendix: Detailed CVE List

### Backend (Source/Backend/package.json)

#### Critical (2)
- **Proxy-Addr IP Spoofing** CVSS 9.1 (GHSA-jqcg-44mw-7w3h)
- **Handlebars AST Injection** CVSS 8.1 (GHSA-3mfm-83xf-c92r)

#### High (33)
- @jest/console, @jest/core, @jest/environment, @jest/expect, @jest/fake-timers, @jest/globals, @jest/reporters, @jest/test-result, @jest/test-sequencer, @jest/transform, jest-circus, jest-config, jest-haste-map, jest-message-util, jest-resolve, jest-runner, jest-runtime, jest-snapshot, jest-watcher, micromatch, and others

#### Moderate (5)
- @babel/core (GHSA-4x5r-pxfx-6jf8)
- Various transitive dependencies

#### Low (2)
- Minor vulnerabilities in transitive dependencies

### Frontend (Source/Frontend/package.json)

#### Critical (2)
- **Vitest RCE** via tinypool prototype pollution
- **Tinypool RCE** CVSS 9.0

#### High (7)
- @remix-run/router (GHSA-2j2x-hqr9-3h42 - open redirect)
- @vitest/mocker (GHSA-82fw-gwwq-j7x9 - path traversal)
- Others

#### Moderate (7)
- vite, vitest ecosystem issues

#### Low (1)
- @babel/core and transitive dependencies

### E2E (Source/E2E/package.json)
**Status:** ✅ No vulnerabilities

---

## Next Steps

1. ✅ Read this report
2. ⏭️ Schedule security review with TheGuardians
3. ⏭️ Coordinate with TheFixer for dependency upgrades
4. ⏭️ Execute Phase 1 remediation (this week)
5. ⏭️ Re-run audit to verify fixes
6. ⏭️ Generate compliance report for Phase 3

---

**Report Generated By:** Dependency Auditor Agent  
**Report ID:** audit-2026-10-15-c  
**Next Review:** 2026-10-22 (after remediation)
