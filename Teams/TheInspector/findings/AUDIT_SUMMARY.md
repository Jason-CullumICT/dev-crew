# Dependency Audit Summary — dev-crew
**Date:** 2026-05-28  
**Agent:** dependency_auditor  
**Status:** ✅ COMPLETE

---

## Quick Facts

| Metric | Value | Status |
|--------|-------|--------|
| **CVEs Found** | 13 | ⚠️ Action Required |
| **Critical CVEs** | 1 (Handlebars RCE) | 🔴 URGENT |
| **Moderate CVEs** | 12 | 🟡 Required |
| **Packages Analyzed** | 643 (prod + transitive) | ✅ Complete |
| **License Compliance** | 100% compliant | ✅ Safe |
| **Supply Chain Risk** | Low | ✅ Clean |
| **Grade** | **B** (will be **A** after fixes) | ⚠️ Needs updates |

---

## Critical Issue — ACT NOW

### 🔴 Handlebars RCE (CVSS 9.8)
**Location:** `Source/Backend/package.json` → ts-jest@29.4.6 → handlebars@4.7.8

**The Issue:**
Multiple JavaScript injection vulnerabilities in Handlebars allow remote code execution if templates are compiled from untrusted sources. This affects ts-jest (the test compiler).

**Fix:**
```bash
cd Source/Backend
npm update ts-jest
npm audit  # Verify handlebars bumps to >=4.7.9
```

**Timeline:** Fix **today** — this is test harness code execution.

---

## Moderate Issues — Fix This Sprint

### Express DoS (CVSS 5.3)
Query string parser vulnerability allows denial of service via malformed requests.

```bash
cd Source/Backend
npm update express
```

### uuid Buffer Overflow (CVSS 7.5)
If your code uses `uuid.v3()`, `uuid.v5()`, or `uuid.v6()` with custom buffers, there's a buffer overflow risk.

**Action:**
1. Search codebase for `uuid.v[356]`
2. If found, test after upgrade to uuid@14.0.0
3. If not found, no urgent action needed

### Vite/Vitest Build Tool Vulnerabilities
Frontend has 6 moderate CVEs in dev-time build tools (vite, esbuild, postcss, ws).

```bash
cd Source/Frontend
npm update vite vitest
npm audit
```

**Note:** These don't affect production code (React is clean), only developer machines and CI/CD.

---

## Detailed Findings

### Full Report
📄 **[dependency-audit-2026-05-28.md](./dependency-audit-2026-05-28.md)**
- All 13 CVEs with CVSS scores, CVE IDs, and remediation steps
- License analysis and compliance report
- Outdated package recommendations
- Supply chain risk assessment

### Machine-Readable Data
📊 **[dependency-audit-2026-05-28.json](./dependency-audit-2026-05-28.json)**
- Structured JSON for dashboard integration
- Severity counts, affected packages, fix commands
- License breakdown by workspace

---

## Remediation Checklist

- [ ] **Update ts-jest** (fixes handlebars RCE)
  ```bash
  cd Source/Backend && npm update ts-jest && npm test
  ```

- [ ] **Update express** (fixes express/qs DoS)
  ```bash
  cd Source/Backend && npm update express && npm test
  ```

- [ ] **Audit uuid usage** (fixes uuid buffer overflow)
  - Search: `uuid.v3\|uuid.v5\|uuid.v6`
  - Decide: upgrade to uuid@14 or continue with v9

- [ ] **Update Frontend build tools** (fixes vite/vitest CVEs)
  ```bash
  cd Source/Frontend && npm update vite vitest && npm run build
  ```

- [ ] **Run E2E tests** (verify all changes don't break app)
  ```bash
  cd Source/E2E && npm test
  ```

- [ ] **Verify production code is unaffected**
  - React: Clean ✅
  - React Router: Clean ✅
  - Express handlers: Update express, test routes
  - UUID logic: Audit for v3/v5/v6 usage

---

## Cross-Team Escalations

### TheGuardians 🛡️
- **Handlebars RCE**: Needs security review to confirm no untrusted template input
- **uuid buffer overflow**: Code audit if v3/v5/v6 used with custom buffers

### TheFixer
- Express, uuid, vite, vitest updates (after security sign-off)

---

## Metrics Summary

```json
{
  "cves_critical": 1,
  "cves_high": 0,
  "cves_moderate": 12,
  "cves_low": 0,
  "total_cves": 13,
  "packages_analyzed": 643,
  "license_compliance_ok": true,
  "supply_chain_risk": "low",
  "post_install_scripts": 0,
  "duplicate_major_versions": 0,
  "outdated_major_versions": 4,
  "audit_time_hours": 0.5
}
```

---

## Next Steps

1. **Today**: Review this summary with team lead
2. **This Week**: Apply fixes in order (ts-jest → express → uuid → vite)
3. **Next Week**: Re-run `npm audit` in each workspace to confirm all CVEs resolved
4. **This Month**: Set up Dependabot/Snyk for continuous monitoring
5. **Next Quarter**: Plan major version upgrades (React 19, Pino 10, Express 5)

---

**Report Generated:** 2026-05-28 by dependency_auditor  
**Files:** 
- Full Report: `dependency-audit-2026-05-28.md` 
- JSON Export: `dependency-audit-2026-05-28.json`
- Learnings: `../learnings/dependency-auditor.md`
