# Dependency Audit Findings Index
**Audit Date:** 2026-06-06  
**Status:** Complete  
**Grade:** C (Critical issues found)

## Quick Links

### Executive Summary
**Overall Assessment:** ⚠️ VULNERABLE  
**15 CVEs found** (1 CRITICAL, 4 HIGH, 10 MEDIUM/LOW)  
**8 packages with major version gaps**  
**4 deprecated packages**  
**License Compliance: ✅ PASSING**

### Full Reports

1. **[dependency-audit-findings.md](./dependency-audit-findings.md)** — DETAILED REPORT
   - 406 lines of comprehensive CVE analysis
   - Individual findings DEP-001 through DEP-015
   - Remediation priorities and npm commands
   - Cross-team escalations
   - License compliance details

2. **[dependency-audit-summary.json](./dependency-audit-summary.json)** — MACHINE-READABLE METRICS
   - Structured data for dashboard integration
   - Severity breakdown by project
   - CVE details with CWE/CVSS mappings
   - Remediation steps and npm commands
   - Cross-reference tags for team routing

### Learnings & Knowledge Base
**[Teams/TheInspector/learnings/dependency-auditor.md](../learnings/dependency-auditor.md)** — PERSISTENT FINDINGS
- Environment setup notes
- Audit findings summary
- Recurring package watch list
- Key learnings for next audit cycle
- License checking workflow

---

## At-a-Glance Summary

### By Severity

| Severity | Count | Key Findings |
|----------|-------|--------------|
| 🔴 CRITICAL (P1) | 1 | Handlebars JS injection (CVSS 9.8) |
| 🟠 HIGH (P2) | 4 | UUID buffer overflow, Pino outdated, deprecated glob, deprecated supertest |
| 🟡 MEDIUM (P3) | 10 | PostCSS XSS, React Router redirect, qs DoS, + others |

### By Project

| Project | Direct | Transitive | CVEs | Risk |
|---------|--------|-----------|------|------|
| Backend | 14 | 411 | 6 | 🔴 CRITICAL |
| Frontend | 13 | 230 | 9 | 🟠 HIGH |
| E2E | 1 | 5 | 0 | 🟢 LOW |
| **TOTAL** | **17** | **641** | **15** | **C** |

### License Breakdown

✅ **PASSING** — 641 packages scanned
- MIT: 348 (54%)
- ISC: 34 (5%)
- BSD-3-Clause: 15 (2%)
- Apache-2.0: 8 (1%)
- Other/Unlicensed: 2 (<1%)

**No GPL/AGPL/SSPL violations detected**

---

## Critical Action Items

### Immediate (This Sprint)

1. **Handlebars (DEP-001)** — P1 CRITICAL
   - Verify installation: `npm ls handlebars`
   - If found: `npm update handlebars` (fix to v4.7.8+)
   - If phantom: `npm cache clean --force && npm audit fix`
   - Escalate to red-teamer for template injection assessment

2. **UUID (DEP-002)** — P2 HIGH
   - Current: 9.0.1 → Latest: 14.0.0 (5 major versions)
   - Breaking change; requires code testing
   - Command: `npm update uuid@14.0.0`
   - Assess: Check if code passes `buf` parameter

3. **Pino (DEP-003)** — P2 HIGH
   - Current: 8.21.0 → Latest: 10.3.1
   - Missing security patches in audit-critical logging path
   - Command: `npm update pino@10.3.1`

4. **glob (DEP-004)** — P2 HIGH
   - Deprecated with known security vulnerabilities
   - Inherited by Jest/TypeScript ecosystem
   - Requires coordinated upgrade across dependencies

### Short-Term (This Month)

5. **supertest (DEP-005)** — Update to 7.1.3
6. **express (DEP-006)** — Plan v5.x migration
7. **React stack (DEP-007)** — Update React/React-DOM/Router to latest majors

### Medium-Term (Next Quarter)

8-15. Moderate CVEs (PostCSS, React Router, qs, esbuild, etc.)
- Schedule quarterly maintenance window
- Monitor deprecated packages for ecosystem removal

---

## Quick Fix Commands

### Safe (No Breaking Changes)
```bash
cd Source/Backend && npm audit fix
cd Source/Frontend && npm audit fix
```

### Breaking Changes (Requires Testing)
```bash
npm update uuid@14.0.0
npm update pino@10.3.1
npm update express@5.0.0
npm update react@19
npm update react-router-dom@7
```

### Full Verification
```bash
npm audit
npm test
npm run build
```

---

## Cross-Team Routing

### → TheGuardians (Security Team)
Findings: **DEP-001, DEP-002, DEP-010**
- **DEP-001 (Handlebars):** Assess template injection attack surface
- **DEP-002 (UUID):** Verify buf parameter security implications
- **DEP-010 (qs):** Audit qs.stringify usage in custom middleware

### → TheFixer (Development Team)
Findings: **DEP-002 through DEP-007**
- Create sprint for dependency updates
- Assign test coverage for breaking changes
- Update CI/CD pipeline post-upgrade

---

## Files in This Directory

```
findings/
├── INDEX.md                          ← You are here
├── README.md                         ← General findings guidelines
├── dependency-audit-findings.md      ← FULL DETAILED REPORT (406 lines)
└── dependency-audit-summary.json     ← Machine-readable metrics (268 lines)
```

## Related Documents

- `Teams/TheInspector/inspector.config.yml` — Audit configuration
- `Teams/TheInspector/learnings/dependency-auditor.md` — Persistent learnings
- `CLAUDE.md` — Project specifications and architecture rules

---

## Metrics Summary

```json
{
  "audit_date": "2026-06-06",
  "grade": "C",
  "cves_critical": 1,
  "cves_high": 0,
  "cves_medium": 5,
  "cves_low": 8,
  "cves_total": 15,
  "outdated_major_versions": 8,
  "deprecated_packages": 4,
  "license_violations": 0,
  "total_direct_dependencies": 17,
  "total_transitive_dependencies": 641
}
```

---

**Next Review:** Quarterly or after major dependency updates  
**Audit Tool:** npm audit (built-in), npm outdated, jq (package-lock parsing)  
**Agent:** dependency_auditor (Haiku model)
