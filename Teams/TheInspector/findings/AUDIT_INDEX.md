# Dependency Audit Reports

## Latest Audit: 2026-06-26

### Files in this audit

| File | Purpose | Format |
|------|---------|--------|
| `dependency-audit-2026-06-26.md` | **Detailed findings report** | Markdown (human-readable) |
| `dependency-audit-2026-06-26.json` | **Structured data for dashboards** | JSON (machine-parseable) |

---

## Quick Links

- **Overall Grade:** C- (actionable issues present)
- **Critical Findings:** 2 (Vitest RCE, Minizlib DoS)
- **High Findings:** 4 (form-data, Vite, ws, uuid)
- **Total Findings:** 20

### Immediate Actions (Week 1)

**Frontend:**
```bash
cd Source/Frontend
npm install vitest@^3.2.6 --save-dev    # CRITICAL RCE fix
npm install vite@^8.1.0 --save-dev      # Path traversal fixes
npm install form-data@^4.0.6 --save     # CRLF injection fix
npm install react-router-dom@6.30.4    # Open redirect fix
npm audit fix
```

**Backend:**
```bash
cd Source/Backend
npm install uuid@^11.1.1 --save         # Buffer overflow fix
npm audit fix                           # Other moderate CVEs
```

---

## Findings Summary by Severity

### Critical (P1) - 2 issues
- **DEP-001:** Vitest UI Server RCE (9.8 CVSS)
- **DEP-002:** Minizlib DoS (7.5 CVSS)

### High (P2) - 4 issues
- **DEP-003:** form-data CRLF injection (7.5 CVSS)
- **DEP-004:** Vite path traversal (7.5 CVSS)
- **DEP-005:** ws memory exhaustion (7.5 CVSS)
- **DEP-013:** uuid buffer overflow (7.5 CVSS)

### Moderate (P3) - 24 issues
- **DEP-006 to DEP-012:** Various DoS, XSS, bypass issues
- **DEP-014 to DEP-019:** Outdated major versions (Express, Pino, React, Vite, React Router)
- **DEP-020:** Jest ecosystem CVEs (dev-only)

### Low (P4) - 1 issue
- **@babel/core:** Information disclosure via sourceMappingURL

---

## Cross-Team Escalations

| Team | Severity | Issues | Action |
|------|----------|--------|--------|
| **TheGuardians** | CRITICAL | DEP-001, DEP-002 | Security audit before deployment |
| **TheGuardians** | HIGH | DEP-003, DEP-004, DEP-008 | Verify exploitability |
| **TheFixer** | MEDIUM | DEP-014–DEP-020 | Plan & execute major version migrations |
| **quality-oracle** | LOW | Spec coverage | Verify FR coverage after upgrades |

---

## Workspaces Scanned

### Source/Backend
- **Direct deps:** 8
- **Total packages:** 412
- **Vulnerabilities:** 27 (1 critical, 1 high, 24 moderate, 1 low)

### Source/Frontend
- **Direct deps:** 3
- **Total packages:** 231
- **Vulnerabilities:** 11 (1 critical, 3 high, 6 moderate, 1 low)

### Source/E2E
- **Direct deps:** 4
- **Total packages:** 4
- **Vulnerabilities:** 0 ✓ CLEAN

---

## Remediation Timeline

| Timeframe | Task | Effort |
|-----------|------|--------|
| Week 1 | Critical & High CVE fixes | 2–4 hours |
| Month 1 | P3 outdated version updates | 2 hours |
| Q3 2026 | Major version migrations (React 19, Vite 8, Express 5) | 40 hours |

---

## Learnings

See `Teams/TheInspector/learnings/dependency-auditor.md` for:
- Watch list of packages with recurring CVEs
- Audit tooling notes
- Environment-specific recommendations
- Historical decisions made by the team

---

## How to Use This Report

1. **For quick reference:** Read this file
2. **For detailed analysis:** Open `dependency-audit-2026-06-26.md`
3. **For integration/dashboards:** Parse `dependency-audit-2026-06-26.json`
4. **For team decisions:** Check learnings file

---

**Audit Date:** 2026-06-26  
**Auditor:** dependency-auditor (Haiku)  
**Next Review:** Recommended within 30 days
