# Dependency Audit Report — 2026-08-28

**Audit Duration:** Full scope (6 npm projects)  
**Status:** ✅ Complete  
**Generated:** 2026-08-28

---

## Executive Summary

**63 vulnerabilities** identified across 6 npm projects:
- **4 Critical** — Require immediate action
- **22 High** — Address this sprint
- **31 Moderate** — Plan remediation
- **6 Low** — Monitor and fix opportunistically

**Key Risk:** Frontend test runner (vitest) has RCE vulnerability if UI server exposed. Orchestrator protobufjs can execute arbitrary code from malicious .proto files.

---

## Quick Action Items

### 🚨 Today (Critical)

```bash
# 1. Check if vitest UI is exposed in CI/production
npm ls vitest --depth=0

# 2. Upgrade vitest to ≥3.2.6
npm install --save-dev vitest@latest

# 3. Review orchestrator's protobufjs usage
grep -r "loadSync\|load" platform/orchestrator/

# 4. Upgrade protobufjs to latest
npm install protobufjs@latest
```

### ⚠️ This Week (High)

- Upgrade vite to ≥5.5.0 (path traversal fix)
- Coordinate express/body-parser updates (DoS in qs library)
- Upgrade @opentelemetry packages in portal/Backend
- Upgrade @grpc/grpc-js to ≥1.14.4

### 📅 Next Sprint (Medium)

- Plan React 19.x upgrade for frontend projects
- Evaluate dockerode 5.x for orchestrator
- Update uuid to ≥11.1.1 (breaking API change)

---

## Critical Findings

### 🔴 GHSA-5xrq-8626-4rwp: Vitest UI Arbitrary File Read/Execution

**CVSS 9.8** | **CWE-22, CWE-862**

**Affected:**
- `Source/Frontend@2.0.5` (dev dependency)
- `portal/Backend@1.2.2` (dev dependency)
- `portal/Frontend@3.2.5` (dev dependency)

**Description:**  
When Vitest UI server is running (`vitest --ui`), unauthenticated remote attackers can read and execute arbitrary files on the system. The vulnerability bypasses filesystem access controls.

**Attack Scenario:**
```
1. Attacker discovers vitest UI server running on localhost:51204
2. Sends crafted request to read /etc/passwd or ../../../../../secrets
3. Can also execute arbitrary code through file access
```

**Mitigation:**
- ✅ Upgrade to vitest ≥3.2.6
- ✅ Never expose vitest UI server on public networks
- ✅ Disable vitest UI in production environments
- ✅ In CI: use `vitest run` instead of `vitest --ui`

**Fix:**
```bash
cd Source/Frontend && npm install --save-dev vitest@latest
cd portal/Backend && npm install --save-dev vitest@latest
cd portal/Frontend && npm install --save-dev vitest@latest
```

**Reference:** https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp

---

### 🔴 GHSA-gx4f-cqfv-7h5q: Protobufjs Arbitrary Code Execution

**CVSS 9.8** | **CWE-94**

**Affected:**
- `platform/orchestrator` (via grpc dependencies)
- `portal/Backend` (via @opentelemetry modules)

**Description:**  
Deserializing untrusted Protocol Buffer definitions can lead to arbitrary code execution. The vulnerability exists in the `.proto` option parsing and can be triggered when the orchestrator loads or parses .proto files from external sources.

**Attack Scenario:**
```
1. Attacker crafts malicious .proto file with specially crafted option values
2. Orchestrator loads .proto via loadSync() or load()
3. Arbitrary code executes in orchestrator process
```

**Mitigation:**
- ✅ Never load .proto files from untrusted sources
- ✅ Validate and sanitize all .proto input
- ✅ Upgrade to protobufjs ≥7.6.5 or latest 8.x
- ✅ Consider vendoring .proto files instead of dynamic loading

**Fix:**
```bash
npm audit fix --save-dev  # Check what bumps are possible
# OR manually:
npm install protobufjs@latest
```

**Reference:** https://github.com/protobufjs/protobuf.js/security/advisories

---

## High Severity Findings (22 Total)

### GHSA-q7rr-3cgh-j5r3: OpenTelemetry Prometheus Exporter Crash

**CVSS 7.5** | `portal/Backend`

Malformed HTTP request crashes Prometheus metrics endpoint. Upgrade `@opentelemetry/auto-instrumentations-node` to ≥0.75.0.

---

### GHSA-fx2h-pf6j-xcff: Vite fs.deny Bypass on Windows

**CVSS 7.5** | `Source/Frontend`, `portal/Frontend`

Windows-specific path traversal allows reading files outside project root. **Dev-time only.** Upgrade vite to ≥5.5.0.

---

### GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895: Brace-Expansion DoS (4 CVEs)

**CVSS 7.5** | `Source/Backend`

Parsing certain glob patterns causes infinite loops and memory exhaustion. Transitive via jest. Update jest dependencies to pull brace-expansion ≥1.1.18.

**Example:**
```typescript
// This pattern causes CPU exhaustion:
const glob = "{a,b}{c,d}{e,f}{g,h}{i,j}{k,l}{m,n}{o,p}{q,r}{s,t}{u,v}{w,x}{y,z}";
```

---

### GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj: JS-YAML DoS (3 CVEs)

**CVSS 7.5** | `Source/Backend`

Quadratic CPU consumption via merge keys and !!omap entries. Upgrade js-yaml to ≥3.15.1.

**Example:**
```yaml
# This pattern consumes CPU linearly with input size
key1: &anchor1 value
merge1:
  <<: *anchor1
  <<: *anchor1
  <<: *anchor1
  # ... repeat 1000x
```

---

### GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq: gRPC-JS Crash (2 CVEs)

**CVSS 7.5** | Transitive via OpenTelemetry

Malformed gRPC messages crash client/server. Upgrade `@grpc/grpc-js` to ≥1.14.4.

---

### GHSA-hmw2-7cc7-3qxx: Form-Data CRLF Injection

**CVSS 7.5** | `Source/Frontend`, `portal/Frontend`

Unescaped field names inject CRLF sequences into multipart form data. Upgrade form-data to ≥4.0.6.

---

### GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8: Nanoid Infinite Loop (2 CVEs)

**CVSS 5.9** | `portal/Frontend`

Negative size or zero-size custom generators cause infinite loops. Upgrade nanoid to ≥3.3.18.

---

### GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p: WebSocket Memory Exhaustion (2 CVEs)

**CVSS 7.5** | `Source/Frontend`, `portal/Frontend`

Tiny fragmented messages exhaust server memory/CPU. Upgrade ws to ≥8.21.0.

**Mitigation:** Set `maxPayload` limit:
```typescript
const ws = new WebSocket(url);
ws.maxPayload = 100 * 1024; // 100KB limit
```

---

### GHSA-37ch-88jc-xwx2: path-to-regexp ReDoS

**CVSS 7.5** | `platform/orchestrator`

Multiple route parameters trigger exponential regex backtracking. Upgrade path-to-regexp (via express dependency).

---

## Outdated Major Versions

| Project | Package | Current | Latest | Gap | Action |
|---------|---------|---------|--------|-----|--------|
| Source/Backend | express | 4.18.2 | 5.2.1 | 3+ patches | Patch to 4.22.2 |
| Source/Backend | uuid | 9.0.0 | 14.0.2 | 5+ majors | ⚠️ Breaking changes |
| Source/Frontend | react | 18.3.1 | 19.2.8 | 1+ major | Plan upgrade |
| Source/Frontend | react-router-dom | 6.26.0 | 7.18.2 | 1+ major | Plan upgrade |
| platform/orchestrator | express | 4.21.0 | 5.2.1 | 3+ patches | Patch to 4.22.2 |
| platform/orchestrator | dockerode | 4.0.4 | 5.0.1 | 1 major | Evaluate |
| platform/orchestrator | multer | 1.4.5-lts | 2.2.0 | 1 major | Evaluate |

---

## Dependency Tree Analysis

| Project | Direct | Transitive | Total | Risk Level |
|---------|--------|------------|-------|-----------|
| Source/E2E | 1 | 4 | **5** | ✅ Minimal |
| portal/Frontend | 11 | 413 | **424** | ⚠️ High (dev tooling) |
| Source/Backend | 15 | 396 | **411** | ⚠️ High (test framework) |
| portal/Backend | 18 | 263 | **281** | ⚠️ Moderate |
| Source/Frontend | 14 | 216 | **230** | ⚠️ Moderate |
| platform/orchestrator | 3 | 153 | **156** | ⚠️ Moderate |

**Total:** 1,400+ transitive dependencies

**Observation:** Frontend projects accumulate large dependency trees due to build tooling (Vite, Vitest, testing-library). This is industry standard but increases supply chain risk surface.

---

## License Compliance

✅ **PASSED**

- No GPL/AGPL dependencies in direct dependencies
- No unknown/UNLICENSED packages
- All packages use standard OSS licenses (MIT, Apache-2.0, BSD, ISC)

**Safe for commercial use.**

---

## Supply Chain Risk Assessment

### Risk Factors

| Factor | Rating | Notes |
|--------|--------|-------|
| Dependency count | Moderate | 1,400+ is large but typical for modern JS projects |
| Post-install scripts | Low | Minimal use (express ecosystem standard) |
| Single-maintainer deps | Low | uuid, nanoid are well-established |
| Abandoned deps | None | No detected |
| Recently transferred ownership | None | No detected |

### Recommendations

1. **Baseline monitoring:** Run npm audit in CI/CD on every PR
2. **Frequency:** Monthly full audit or after major dependency updates
3. **Policy:** Update all moderate vulnerabilities within sprint
4. **Critical CVEs:** Fix within 24 hours if in direct dependencies
5. **Coordination:** Sync express/uuid/react updates across projects

---

## Remediation Timeline

### Immediate (Today)

- [ ] Verify vitest UI server is not exposed in production
- [ ] Upgrade vitest to ≥3.2.6 across all projects
- [ ] Review protobufjs usage in orchestrator
- [ ] Disable vitest UI in CI environments

### This Week

- [ ] Upgrade vite to ≥5.5.0
- [ ] Upgrade @opentelemetry packages in portal
- [ ] Upgrade @grpc/grpc-js to ≥1.14.4
- [ ] Coordinate express updates (4.22.2 or 5.x)

### Next Sprint

- [ ] Evaluate React 19.x upgrade path
- [ ] Plan uuid 11.x migration (breaking API)
- [ ] Evaluate dockerode 5.x for orchestrator
- [ ] Audit js-yaml and brace-expansion fixes

### Long-term (Quarterly)

- [ ] Establish dependency version policy
- [ ] Set up automated dependency bumping (Dependabot)
- [ ] Document upgrade priorities by project

---

## References

- [npm Audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [GHSA (GitHub Security Advisory)](https://github.com/advisories)
- [CVE Search](https://www.cvedetails.com/)

---

## Audit Metadata

- **Auditor:** Dependency Auditor Agent (dependency_auditor)
- **Date:** 2026-08-28
- **Scope:** 6 npm projects, 1,400+ dependencies
- **Tools:** npm audit v9+
- **Next Review:** 2026-09-28 (recommended)

---

## Appendix: How to Run Individual Audits

```bash
# Backend
cd Source/Backend && npm audit && npm outdated

# Frontend
cd Source/Frontend && npm audit && npm outdated

# E2E
cd Source/E2E && npm audit

# Orchestrator
cd platform/orchestrator && npm audit && npm outdated

# Portal Backend
cd portal/Backend && npm audit

# Portal Frontend
cd portal/Frontend && npm audit && npm outdated
```

---

**End of Report**
