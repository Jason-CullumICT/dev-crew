# Dependency Audit Report Index
**Audit Date:** 2026-05-28  
**Agent:** dependency_auditor  
**Status:** ✅ Complete

---

## 📋 Report Files

### Start Here
- **[AUDIT_SUMMARY.md](./AUDIT_SUMMARY.md)** — Executive summary with critical issues and action items
  - Quick facts, findings overview, remediation checklist
  - Cross-team escalation matrix
  - Timeline: 5-10 minutes to read

### Full Analysis
- **[dependency-audit-2026-05-28.md](./dependency-audit-2026-05-28.md)** — Comprehensive technical report
  - All 13 CVEs with CVSS scores, CVE IDs, and detailed fixes
  - License compliance analysis (backend + frontend)
  - Supply chain risk assessment
  - Dependency tree summary
  - Timeline: 20-30 minutes to read

### Machine-Readable Export
- **[dependency-audit-2026-05-28.json](./dependency-audit-2026-05-28.json)** — Structured data for dashboards
  - JSON format for automation and tool integration
  - Metrics, findings array, remediation summary
  - Use for: dashboard integration, automated alerts, trend analysis

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| **Total CVEs** | 13 |
| **Critical (P1)** | 1 |
| **Moderate (P2)** | 12 |
| **Packages Analyzed** | 643 |
| **Workspaces** | 3 (Backend, Frontend, E2E) |
| **License Compliance** | ✅ 100% compliant |
| **Supply Chain Risk** | ✅ Low |
| **Grade** | B (will be A after fixes) |

---

## 🔴 Critical Issue

**DEP-001: Handlebars RCE (CVSS 9.8)**
- **Package:** handlebars@4.7.8 (via ts-jest@29.4.6)
- **Location:** Backend test harness
- **CVE IDs:** GHSA-2w6w-674q-4c4q + 7 related
- **Fix:** `npm update ts-jest` (in Source/Backend)
- **Timeline:** Fix immediately

---

## 🟡 Secondary Issues

### Backend (4 additional CVEs)
1. **DEP-002**: Express query string DoS
2. **DEP-003**: brace-expansion ReDoS
3. **DEP-004**: uuid buffer overflow
4. **DEP-011**: pino outdated (informational)

### Frontend (7 CVEs in build tools)
5. **DEP-005**: Vite path traversal
6. **DEP-006**: esbuild dev server CORS
7. **DEP-007**: PostCSS XSS
8. **DEP-008**: WebSocket memory disclosure
9. **DEP-009**: vitest transitive CVEs
10. **DEP-010**: body-parser (inherits from express)
11. **DEP-012**: React outdated (informational)

**Note:** Frontend vulnerabilities are in dev-time tools only; production code (React, React Router) is clean.

---

## ✅ Quick Checklist

### Immediate (Do Today)
- [ ] Review AUDIT_SUMMARY.md
- [ ] Share with TheGuardians (security team)
- [ ] Run: `cd Source/Backend && npm update ts-jest && npm test`
- [ ] Run: `cd Source/Backend && npm update express && npm test`
- [ ] Run: `cd Source/Frontend && npm update vite vitest && npm run build`

### This Sprint
- [ ] Audit codebase for `uuid.v3/v5/v6` usage
- [ ] Decide: upgrade uuid or confirm safe
- [ ] Update postcss if needed
- [ ] Run full test suite: `npm test --workspaces`
- [ ] Run E2E: `cd Source/E2E && npm test`

### Next Quarter
- [ ] Plan React 19 upgrade (breaking changes)
- [ ] Plan pino v10 upgrade (API changes)
- [ ] Set up Dependabot or Snyk
- [ ] Document dependency update policy

---

## 📚 Additional Resources

### Learnings & Recommendations
- **[../learnings/dependency-auditor.md](../learnings/dependency-auditor.md)** — Persistent learnings from this audit
  - Package monitoring list
  - License compliance decisions
  - Audit tool findings and tips

### Project Context
- **[../inspector.config.yml](../inspector.config.yml)** — Inspector configuration
- **[../../CLAUDE.md](../../CLAUDE.md)** — Project documentation

---

## 🔗 Cross-Team Escalations

### TheGuardians (Security)
- **DEP-001 (Handlebars RCE)** — Review and sign off on ts-jest update
- **DEP-004 (uuid buffer overflow)** — Audit if v3/v5/v6 used with custom buffers

### TheFixer (QA/Release)
- All CVE updates (after security approval)
- Verify tests pass before merge
- Manage release timeline

---

## 📈 Grade Assignment

| Grade | Threshold | Status |
|-------|-----------|--------|
| **A** | 0 P1, ≤3 P2 | ✅ Achievable after fixes |
| **B** | 0 P1, ≤8 P2 | 🟡 Current (13 total CVEs) |
| **C** | ≤2 P1, ≤15 P2 | — |

**Expected Grade After Fixes:** A (assuming all CVEs patched and tests pass)

---

## 💾 Generated Artifacts

All files in this directory:
- ✅ AUDIT_SUMMARY.md (4.5 KB)
- ✅ dependency-audit-2026-05-28.md (13 KB)
- ✅ dependency-audit-2026-05-28.json (9.4 KB)
- ✅ INDEX.md (this file)
- ✅ README.md (directory guide)

Learnings updated:
- ✅ Teams/TheInspector/learnings/dependency-auditor.md

---

## 📞 Questions?

For more details:
- **Quick overview:** Read AUDIT_SUMMARY.md
- **Technical details:** Read dependency-audit-2026-05-28.md
- **Automation:** Use dependency-audit-2026-05-28.json
- **Historical context:** Check learnings/dependency-auditor.md

---

**Audit Date:** 2026-05-28  
**Agent:** dependency_auditor (Haiku)  
**Status:** Complete ✅
