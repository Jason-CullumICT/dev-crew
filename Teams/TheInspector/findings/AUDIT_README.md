# Dependency Audit Findings — 2026-07-30

**Grade: F** (CRITICAL — 3 vulnerabilities require immediate patching)

---

## 📋 Quick Start

**Status:** 78 vulnerabilities across 6 npm workspaces
- **🔴 CRITICAL (3)** — Fix within 24 hours
- **🟠 HIGH (10)** — Fix this week
- **🟡 MODERATE (59)** — Plan this month
- **ℹ️ LOW (6)** — Monitor

**Critical Fixes Required:**
```bash
# 1. Vitest UI (Frontend & Portal/Frontend) — CVSS 9.8
cd Source/Frontend && npm update vitest@3.2.6 --save-dev && npm test
cd portal/Frontend && npm update vitest@3.2.6 --save-dev && npm test

# 2. Handlebars (Source/Backend) — CVSS 9.8
cd Source/Backend && npm update handlebars@4.7.9 --save && npm test

# 3. OpenTelemetry + gRPC (portal/Backend) — CVSS 9.8 + 7.5
cd portal/Backend
npm update @opentelemetry/auto-instrumentations-node@latest --save
npm update @grpc/grpc-js@1.14.4 --save && npm test
```

---

## 📄 Report Files

### For Detailed Analysis
- **`dependency-audit-2026-07-30.md`** (654 lines)
  - Complete findings with CVE details, impact analysis, and fixes
  - Organized by severity and category
  - Cross-references for other teams

### For Dashboard/Viewing
- **`dependency-audit-2026-07-30.html`** (664 lines)
  - Interactive HTML dashboard
  - Visual summary by workspace
  - Remediation roadmap with priority bands

### For CI/CD Integration
- **`dependency-audit-summary.json`** (283 lines)
  - Structured data format
  - Programmatic access to findings
  - Integration with Slack, GitHub, dashboards

### For Quick Reference
- **`AUDIT_SUMMARY.txt`** (270 lines)
  - Text-based quick reference
  - Checklist format for teams
  - One-page summary of critical items

---

## 🔴 Critical Findings Summary

### DEP-001: Handlebars.js JavaScript Injection (8 CVEs)
- **Package:** handlebars@4.7.8
- **Affected:** Source/Backend
- **CVSS:** 9.8 → Remote Code Execution
- **Fix:** `npm update handlebars@4.7.9 --save`

### DEP-002 & DEP-003: Vitest UI Server Arbitrary File Read
- **Package:** vitest@2.0.5
- **Affected:** Source/Frontend, portal/Frontend
- **CVSS:** 9.8 → Developer machine compromise
- **Fix:** `npm update vitest@3.2.6 --save-dev`

### DEP-004: Portal Backend gRPC Cascade Crashes
- **Packages:** @opentelemetry/auto-instrumentations-node, @grpc/grpc-js
- **Affected:** portal/Backend
- **CVSS:** 9.8 + 7.5 → Denial of Service
- **Fix:** Update @opentelemetry and @grpc packages to latest

---

## 📊 Vulnerability Summary

| Workspace | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| Source/Backend | 1 | 4 | 4 | 1 | 10 |
| Source/Frontend | 1 | 4 | 5 | 1 | 11 |
| Source/E2E | 0 | 0 | 0 | 0 | 0 ✅ |
| platform/orchestrator | 1 | 2 | 6 | 0 | 9 |
| portal/Backend | 1 | 7 | 43 | 2 | 54 |
| portal/Frontend | 1 | 5 | 4 | 1 | 11 |
| **TOTAL** | **3** | **10** | **59** | **6** | **78** |

---

## 🛣️ Immediate Actions (Next 24 Hours)

1. Update vitest to fix UI server vulnerability (CVSS 9.8)
2. Update handlebars to fix RCE vulnerability (CVSS 9.8)
3. Update OpenTelemetry & gRPC to fix DoS vulnerability (CVSS 9.8)
4. Run npm test to verify fixes don't break functionality
5. Notify team leads of blocking issues

See `dependency-audit-2026-07-30.md` for detailed remediation steps and cross-team escalations.

---

**Full Report:** See `dependency-audit-2026-07-30.md`  
**Dashboard:** Open `dependency-audit-2026-07-30.html` in browser  
**Date:** 2026-07-30 | **Grade:** F | **Status:** All findings documented
