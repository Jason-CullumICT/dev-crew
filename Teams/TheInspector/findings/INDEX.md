# Dependency Auditor Findings - Index

**Audit Date:** 2026-07-24  
**Overall Grade:** C (3 P1, 8 P2 vulnerabilities)

---

## 📋 Report Files

| File | Format | Size | Purpose |
|------|--------|------|---------|
| [`dependency-audit-2026-07-24.md`](dependency-audit-2026-07-24.md) | Markdown | 14 KB | **PRIMARY REPORT** — Full CVE analysis, severity breakdown, remediation roadmap |
| [`dependency-audit-2026-07-24.json`](dependency-audit-2026-07-24.json) | JSON | 5.7 KB | Machine-readable structured export for dashboard integration |
| [`DEPENDENCY_AUDIT_REPORT.txt`](DEPENDENCY_AUDIT_REPORT.txt) | Plain Text | 9 KB | CLI-friendly ASCII formatted report |

---

## 🎯 Quick Start

**If you have 2 minutes:** Read the [Summary](#audit-summary) below.

**If you have 10 minutes:** Open [`dependency-audit-2026-07-24.md`](dependency-audit-2026-07-24.md) and read the Executive Summary + Critical Findings.

**If you need everything:** Read the full markdown report and check the [Learnings](../learnings/dependency-auditor.md).

---

## 📊 Audit Summary

### Findings Breakdown
- **Critical (P1):** 3 vulnerabilities 🔴 MUST FIX IMMEDIATELY
  - vitest RCE (GHSA-5xrq-8626-4rwp)
  - handlebars RCE (GHSA-2w6w-674q-4c4q)
  - protobufjs RCE (GHSA-xq3m-2v4x-88gg)

- **High (P2):** 8 vulnerabilities ⚠️ FIX IN NEXT RELEASE
  - OpenTelemetry, gRPC, PostCSS, Vite, React Router, Form-Data, etc.

- **Moderate (P3):** 24 vulnerabilities 🟡 PLAN UPGRADE
  - uuid, body-parser, qs, babel, picomatch, js-yaml, etc.

- **Low (P4):** 1 vulnerability ℹ️ INFORMATIONAL

### Compliance
- **License Compliance:** ✅ PASS (no GPL/AGPL)
- **Supply Chain Risk:** ✅ PASS (950 transitive deps monitored)
- **Post-Install Scripts:** ✅ PASS (no suspicious scripts)

### Grade
**C** (acceptable but action required)
- 3 P1 vulnerabilities exceed A/B thresholds
- 8 P2 vulnerabilities within acceptable range
- All must be remediated before next release

---

## 🚀 Immediate Actions

### Phase 1: Critical (This Sprint)
```bash
npm audit fix --workspaces
cd Source/Frontend && npm install vitest@latest react-router-dom@latest vite@latest
cd portal/Frontend && npm install vitest@latest react-router-dom@latest postcss@latest vite@latest
npm test --workspaces
```

### Phase 2: High-Priority (Next Sprint)
- Fix remaining P2 items (DEP-004 through DEP-012)
- Test OpenTelemetry integration
- Verify React Router routing

### Phase 3: Maintenance (Plan Ahead)
- Express 4.x → 5.x migration
- React 18.x → 19.x migration
- @opentelemetry 0.40 → 0.221+ (175 versions behind!)

---

## ⚡ Escalations

### To TheGuardians (Security Team)
Route these RCE vulnerabilities:
- vitest UI server RCE (development)
- handlebars template injection RCE (backend)
- protobufjs code generation RCE (telemetry)
- react-router open redirect → XSS (frontend)

### To TheFixer (Code Quality)
Route these upgrades:
- Major version bumps (Express, React, OpenTelemetry)
- Transitive dependency tree optimization
- CI/CD npm audit integration

---

## 📚 Learnings & Watch List

See [`Teams/TheInspector/learnings/dependency-auditor.md`](../learnings/dependency-auditor.md) for:
- **Watch List:** Packages with recurring CVE patterns
  - handlebars (multiple injection vectors)
  - protobufjs (code generation gadgets)
  - @opentelemetry (severe version skew)
- **License Decisions:** MIT/Apache2/BSD approved; no GPL/AGPL
- **Audit Tools:** npm audit, npm outdated (available in environment)
- **Baseline:** First audit 2026-07-24; prior findings documented

---

## 🔍 Detailed Vulnerability Reference

| # | CVE | Package | CVSS | Severity | Status |
|---|-----|---------|------|----------|--------|
| 1 | GHSA-5xrq-8626-4rwp | vitest | 9.8 | P1 | 🔴 OPEN |
| 2 | GHSA-2w6w-674q-4c4q | handlebars | 9.8 | P1 | 🔴 OPEN |
| 3 | GHSA-xq3m-2v4x-88gg | protobufjs | 9.8 | P1 | 🔴 OPEN |
| 4 | GHSA-q7rr-3cgh-j5r3 | @opentelemetry/auto-instrumentations-node | 7.5 | P2 | 🔴 OPEN |
| 5 | GHSA-5375-pq7m-f5r2 | @grpc/grpc-js | 7.5 | P2 | 🔴 OPEN |
| 6 | GHSA-6g55-p6wh-862q | postcss | 7.5 | P2 | 🔴 OPEN |
| 7 | GHSA-fx2h-pf6j-xcff | vite | 7.5 | P2 | 🔴 OPEN |
| 8 | GHSA-jjmj-jmhj-qwj2 | react-router-dom | 6.9 | P2 | 🔴 OPEN |
| ... | (28 more) | (various) | 3.2–7.5 | P3/P4 | 🔴 OPEN |

See full report for complete CVE reference.

---

## 📈 Outdated Packages

**Critical (2+ major versions behind):**
- @opentelemetry/* (0.40→0.221) — **175 versions behind!** 🔴
- uuid (9.0→14.0) — 5 major versions
- pino (8.17→10.3) — 2 major versions
- express (4.18→5.2) — breaking changes

**Major (1 major version):**
- react (18.3→19.2)
- react-router-dom (6.26→7.18) — breaking API changes
- multer (1.4→2.2)
- better-sqlite3 (12.8→13.0)

---

## 🔄 Next Audit Schedule

**Recommended:** Quarterly (Q4 2026)  
**Trigger:** Critical advisory release or P1 CVE discovery

---

## 📞 Questions?

1. **For vulnerability details:** Open [`dependency-audit-2026-07-24.md`](dependency-audit-2026-07-24.md)
2. **For remediation steps:** See "Remediation Roadmap" section
3. **For policy decisions:** Check `Teams/TheInspector/learnings/dependency-auditor.md`
4. **For JSON export:** Use `dependency-audit-2026-07-24.json` for dashboard integration

---

**Last Updated:** 2026-07-24  
**Auditor:** dependency_auditor (haiku model)  
**Status:** ✅ Ready for team dispatch
