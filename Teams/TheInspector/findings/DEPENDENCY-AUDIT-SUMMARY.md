# 🔍 Dependency Audit Summary — April 26, 2026

**Status:** ⚠️ **2 CRITICAL, 3 HIGH severity issues require immediate attention**

---

## 🚨 Critical Actions (This Week)

### 1. Handlebars RCE - Source/Backend
```bash
cd Source/Backend
npm update handlebars  # upgrade to >=4.7.9
npm test
```
**Why:** 8 vulnerabilities including critical arbitrary code execution  
**CVSS:** 9.8  
**Time:** 15 min  

### 2. protobufjs RCE - Orchestrator & Portal Backend
```bash
cd platform/orchestrator && npm update @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
cd portal/Backend && npm update @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
npm test
```
**Why:** Arbitrary code execution in protobuf parsing  
**CVSS:** 9.8  
**Time:** 30 min + testing  

### 3. path-to-regexp ReDoS - Orchestrator & Portal Backend
```bash
npm update path-to-regexp  # part of Express dependency chain
```
**Why:** Regular expression DoS can hang services with crafted URLs  
**CVSS:** 7.5  
**Impact:** HTTP service denial of service  

---

## 📊 Quick Stats

| Metric | Count |
|--------|-------|
| **Total Findings** | 17 |
| **Critical (P1)** | 2 |
| **High (P2)** | 3 |
| **Moderate (P3)** | 10 |
| **Informational (P4)** | 2 |
| **Projects Affected** | 6 |
| **Estimated Fix Time** | 40 hours |

---

## 📋 By Project

### Source/Backend ⚠️ **CRITICAL**
- **Handlebars:** 8 CVEs (1 critical, 3 high)
- **uuid:** Buffer bounds check missing
- **brace-expansion:** DoS (transitive)
- **Status:** Update required

### Source/Frontend ⚠️ **MODERATE**
- **vite, vitest, postcss:** 6 moderate CVEs (dev-only)
- **React, react-router:** 1 major version behind
- **Status:** Update recommended

### Source/E2E ✅ **CLEAN**
- **Status:** No vulnerabilities

### platform/orchestrator ⚠️ **CRITICAL**
- **protobufjs:** RCE (CVSS 9.8)
- **path-to-regexp:** ReDoS (CVSS 7.5)
- **uuid:** Buffer issue
- **Status:** Critical fixes needed

### portal/Backend ⚠️ **CRITICAL**
- **protobufjs:** RCE (CVSS 9.8)
- **path-to-regexp:** ReDoS (CVSS 7.5)
- **OpenTelemetry:** 6+ months behind (version gap 0.47 → 0.215)
- **uuid:** Buffer issue
- **Status:** Multiple critical fixes needed

### portal/Frontend ⚠️ **MODERATE**
- **picomatch:** ReDoS + method injection (CVSS 7.5)
- **vite, vitest, postcss:** 5 moderate CVEs (dev-only)
- **Status:** Update recommended

---

## 🎯 Remediation Timeline

### Week 1 (Immediate)
- [ ] Handlebars update (Source/Backend)
- [ ] protobufjs updates (orchestrator, portal/Backend)
- [ ] path-to-regexp updates

### Week 2-4 (Short-term)
- [ ] picomatch update (portal/Frontend)
- [ ] uuid update (all projects)
- [ ] vite/vitest/postcss chain updates (all frontends)

### Month 2 (Medium-term)
- [ ] React 19 migration planning (Source/Frontend, portal/Frontend)
- [ ] Express 5 migration planning (Source/Backend, platform/orchestrator)
- [ ] OpenTelemetry version planning (portal/Backend)

---

## 📖 Full Report

**Markdown Report:** [`dependency-audit-2026-04-26.md`](dependency-audit-2026-04-26.md)  
**JSON Data:** [`dependency-audit-2026-04-26.json`](dependency-audit-2026-04-26.json)

---

## 🔗 Cross-Team Escalations

### → TheGuardians
These require security team attention:
1. **Handlebars RCE** - If used with user-supplied templates
2. **protobufjs RCE** - If parsing untrusted protobuf data
3. **path-to-regexp ReDoS** - URL parameter exploitation testing needed

### → red-teamer
Potential attack vectors to test:
- ReDoS via URL parameters on `/api/*` routes
- Template injection via handlebars (if applicable)

---

## 💡 Key Insights

1. **Supply Chain is Healthy**
   - ✓ No post-install scripts detected
   - ✓ All projects use package-lock.json
   - ✓ No GPL/AGPL dependencies

2. **Two Critical RCE Vulnerabilities**
   - Handlebars template engine
   - protobufjs serialization library
   - Both require immediate patching

3. **Version Gap Alert**
   - OpenTelemetry SDK 6+ months behind (v0.47 → v0.215)
   - This is the largest version gap in the codebase
   - Coordinate with infrastructure team for upgrades

4. **Large Dependency Trees**
   - portal/Backend has 397 direct deps (unusually high)
   - Consider consolidation in future refactoring

---

## 🚀 Quick Commands

```bash
# Scan all projects for new vulns
npm audit --workspaces

# Update critical packages
npm update handlebars @opentelemetry/sdk-node path-to-regexp

# Verify fixes
npm audit --json > before.json
npm install
npm audit --json > after.json
# Compare before/after

# Run full test suite
npm test --workspaces --if-present
```

---

## 📅 Next Audit

**Recommended:** Monthly (npm security updates are frequent)  
**Last Run:** 2026-04-26  
**Next Scheduled:** 2026-05-26

---

## ❓ Questions?

- Detailed findings: See `dependency-audit-2026-04-26.md`
- JSON format: See `dependency-audit-2026-04-26.json`
- Learnings & patterns: See `Teams/TheInspector/learnings/dependency-auditor.md`
