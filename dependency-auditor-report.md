---

## **Dependency Audit Complete** 🔍

**Status: FAILED** — Multiple critical vulnerabilities detected  
**Grade: D** (Not production-ready)  
**Report Date:** 2026-08-17  
**Run ID:** run-20260817-030823

---

## **Executive Summary**

I've completed a comprehensive dependency audit across the dev-crew project, scanning **6 npm projects** with **2,159+ total dependencies**. 

### 🔴 **Critical Findings (4)**

| Package | CVE | CVSS | Impact | Action |
|---------|-----|------|--------|--------|
| **handlebars** | GHSA-2w6w-674q-4c4q | 9.8 | Code execution via JS injection in templates | **Update to ≥4.7.9** |
| **vitest** | GHSA-5xrq-8626-4rwp | 9.8 | Arbitrary file read/execute when UI server runs | **Update to ≥4.1.10** |
| **protobufjs** | — | — | Arbitrary code execution in message parsing | **Patch immediately** |
| **@grpc/grpc-js** | GHSA-5375-pq7m-f5r2 | 7.5 | Server crash on malformed gRPC requests | **Update to ≥1.14.4** |

### 🟠 **High-Severity Vulnerabilities (28+)**

- **brace-expansion**: DoS via exponential pattern expansion
- **form-data**: CRLF injection in multipart headers
- **js-yaml**: Quadratic complexity DoS
- **nanoid**: Non-secure ID generation
- **postcss**: XSS via unescaped `</style>` tags
- **vite**: Path traversal in `.map` files
- **ws**: Uninitialized memory disclosure
- **Plus 21+ others**

### 🟡 **Moderate Vulnerabilities (64+)**

Including CVEs in: @babel/core, @remix-run/router, picomatch, esbuild, qs, and others.

---

## **Vulnerability Breakdown by Project**

| Project | Total Deps | Critical | High | Moderate | Risk Level |
|---------|-----------|----------|------|----------|-----------|
| Source/Backend | 411 | 1 | 3 | 4 | P2 |
| Source/Frontend | 230 | 1 | 5 | 6 | P2 |
| Source/E2E | 4 | — | — | — | P4 |
| platform/orchestrator | 230 | — | 3 | 6 | P2 |
| **portal/Backend** | **577** | **2** | **10** | **43** | **🔴 P1** |
| **portal/Frontend** | **424** | **1** | **7** | **5** | **🔴 P1** |

### ⚠️ **Highest Risk**

**portal/Backend** is the largest risk vector:
- 577 total dependencies
- 397 **production** dependencies (largest surface)
- 2 critical + 10 high vulnerabilities
- Likely includes gRPC, protobuf, OpenTelemetry, database libraries

---

## **Compliance Status**

| Category | Result |
|----------|--------|
| License violations | ✅ **PASS** (No GPL/AGPL) |
| Abandoned packages | ✅ **PASS** (None detected) |
| Deprecated packages | 🟡 **CAUTION** (handlebars has poor maintenance) |

---

## **Supply Chain Risk**

- **Total transitive dependencies**: 1,826+
- **Largest single project**: portal/Backend (577 deps)
- **Risk assessment**: **HIGH** — recommend SCA tooling (Snyk/Dependabot)

---

## **Outdated Major Versions (P3)**

- React: 18.3.1 → 19.2.8 (1 major behind)
- Pino: 8.x → 10.3.1 (2 majors behind)
- React Router: 6.26.0 → 7.18.2 (1 major behind)

**Recommendation:** Plan React 19 migration for Q4 2026.

---

## **Remediation Roadmap**

### ⚡ **Immediate (48 hours)**

```bash
# Fix critical vulnerabilities
cd Source/Backend && npm install handlebars@^4.7.9 --save
cd Source/Frontend && npm install vitest@4.1.10 --save-dev
cd portal/Frontend && npm install vitest@4.1.10 --save-dev

# Review protobufjs in portal/Backend
cd portal/Backend && npm audit | grep protobufjs
```

### 📋 **This Week**

```bash
npm audit fix --workspaces --if-present
# Then test each project thoroughly
```

### 📅 **This Month**

- Implement CI gate: reject PRs with critical CVEs
- Set up Dependabot or Snyk for continuous monitoring
- Begin React 19 migration planning

---

## **Escalations to TheGuardians**

The following findings require security team review:

1. **handlebars** — Server-side template injection (code execution)
2. **vitest** — Arbitrary file read/execute (information disclosure + RCE)
3. **protobufjs** — Arbitrary code execution in message parsing
4. **form-data** — HTTP header injection via CRLF
5. **postcss** — Cross-site scripting (CSS output encoding)
6. **nanoid** — Verify not used for security tokens (predictability)

---

## **Detailed Reports**

✅ Full audit report: `Teams/TheInspector/findings/dependency-audit-20260817.md` (425 lines)  
✅ Machine-readable JSON: `Teams/TheInspector/findings/dependency-audit-20260817.json`  
✅ Learnings updated: `Teams/TheInspector/learnings/dependency-auditor.md`  
✅ Pipeline dashboard: Updated with metrics

---

## **Key Takeaways**

1. **Not production-ready** — 4 critical + 28 high vulnerabilities must be resolved
2. **Largest risk: portal/Backend** — 397 production dependencies, needs audit
3. **Patterns**: Dev dependencies carry significant CVE load; transitive chains are deep
4. **License compliance**: ✅ PASS (no GPL/AGPL blocking)
5. **Next action**: Update handlebars & vitest immediately, then run `npm audit fix`

---

**Report Complete** — Dashboard updated, findings stored, learnings documented.
