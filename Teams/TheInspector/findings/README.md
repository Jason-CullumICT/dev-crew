# TheInspector Findings Directory

This directory contains security and quality audit findings from The Inspector team.

## Latest Audit: 2026-07-28

### 📋 Report Files

| File | Purpose | Format |
|------|---------|--------|
| **dependency-audit-2026-07-28.md** | Full dependency audit report with CVE details, fixes, and escalations | Markdown |
| **audit-summary-2026-07-28.json** | Machine-readable audit summary for dashboard integration | JSON |

## Quick Summary

**Total CVEs Found:** 94  
**Critical (P1):** 8 · **High (P2):** 29 · **Moderate (P3):** 55 · **Low (P4):** 2

### Most Critical Findings

1. **Handlebars.js JavaScript Injection** (Source/Backend)
   - Fix: `npm update handlebars@>=4.7.9`
   - Status: Requires immediate patching

2. **Vitest Arbitrary File Read** (Source/Frontend)
   - Fix: `npm update vitest@>=3.2.6`
   - Status: Requires immediate patching

3. **Portal Dependencies Critical CVEs** (portal/Backend, portal/Frontend)
   - Status: Bloated dependency tree, requires investigation

### Key Recommendations

- ✅ Patch all P1 packages within 24 hours
- ✅ Patch all P2 packages within 1 week
- ✅ Integrate `npm audit` into CI/CD (fail on moderate+ CVEs)
- ✅ Quarterly dependency audits (next: 2026-08-28)
- ⚠️ Consider separating portal/ into separate monorepo

## Workspace Health Summary

| Workspace | CVEs | Critical | High | Status |
|-----------|------|----------|------|--------|
| Source/Backend | 9 | 1 | 3 | ⚠️ Needs patching |
| Source/Frontend | 11 | 1 | 4 | ⚠️ Needs patching |
| Source/E2E | 0 | 0 | 0 | ✅ Clean |
| platform/orchestrator | 9 | 1 | 2 | ⚠️ Needs patching |
| portal/Backend | 54 | 2 | 9 | ❌ High risk |
| portal/Frontend | 54 | 2 | 9 | ❌ High risk |

## Cross-Team Escalations

### → TheGuardians (Security Team)
- DEP-001: Handlebars RCE (code injection)
- DEP-002: Vitest file disclosure
- DEP-003: Portal critical CVEs
- DEP-005: form-data CRLF injection

### → chaos-monkey (Chaos Testing)
- DEP-004: brace-expansion DoS scenario

### → red-teamer (Penetration Testing)
- Template injection tests
- CRLF injection in multipart uploads
- Babel sourceMappingURL file read

## Remediation Roadmap

**24-Hour Priority:**
```bash
cd Source/Backend && npm update handlebars
cd Source/Frontend && npm update vitest
cd portal/Backend && npm audit fix
cd portal/Frontend && npm audit fix
```

**1-Week Priority:**
```bash
npm update brace-expansion form-data vite postcss
npm test --workspaces
```

## Next Audit

Scheduled: 2026-08-28 (30-day cycle)

---

**Auditor:** dependency-auditor (Claude Haiku)  
**Report Date:** 2026-07-28  
**Confidence:** HIGH
