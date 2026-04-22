---

## 📋 Dependency Auditor — Audit Complete

I've completed a comprehensive security audit of your npm dependencies. Here's the summary:

### 🎯 **Critical Findings (Action Required)**

| Finding | Severity | Status |
|---------|----------|--------|
| **Handlebars.js Code Injection** (GHSA-2w6w-674q-4c4q) | **P1 CRITICAL** | **ESCALATE to TheGuardians** |
| **Vite Path Traversal** (GHSA-4w7w-66w2-5vf9) | P2 Moderate | Fix available |
| **brace-expansion DoS** (GHSA-f886-m6hf-6m8v) | P2 Moderate | Cascades from ts-jest |

---

### 📊 **Audit Overview**

```
Package Managers:        npm ✓
Direct Dependencies:     27
Transitive Dependencies: 643
─────────────────────────────────
CVEs Detected:           7 total
  · 1 CRITICAL (CVSS 9.8)
  · 1 MODERATE (direct, ts-jest)
  · 5 MODERATE (dev tools)
─────────────────────────────────
Outdated Major Versions: 7 packages
License Violations:      0 ✓
Post-Install Scripts:    0 ✓ (clean)
Overall Grade:           B+ (good with action items)
```

---

### 🔴 **P1 — Handlebars JavaScript Injection (CRITICAL)**

**Location:** Source/Backend  
**Via:** `ts-jest@29.1.2` → `handlebars@4.7.8`  
**Risk:** Arbitrary code execution if templates processed from untrusted sources  
**CVSS Score:** 9.8 (near-perfect exploitability)  

**Multiple injection vectors detected:**
- AST type confusion (CVSS 9.8)
- Dynamic partial object injection (CVSS 8.1)
- CLI precompiler escaping bypass (CVSS 8.3)
- Prototype pollution → XSS (CVSS 4.7)

**Fix:**
```bash
cd Source/Backend
npm install --save-dev ts-jest@30.0.0  # Pulls handlebars@4.7.9+
```

**Escalation:** 🚨 Sent to **TheGuardians** — confirm test code doesn't load handlebars templates from external/untrusted sources.

---

### 🟠 **P2 — Vite Build Tool Path Traversal**

**Location:** Source/Frontend  
**Package:** `vite@5.4.0`  
**Risk:** Directory traversal in `.map` file handling during optimization  

**Cascading vulnerabilities:**
- esbuild CORS bypass (dev server responds to cross-origin requests)
- vitest/mocker transitive deps

**Fix:**
```bash
cd Source/Frontend
npm install --save-dev vite@^6.4.2
```

---

### 🟡 **P3 — Outdated Dependencies**

**Backend — 4 packages behind major versions:**
- `uuid@9.0.0` → **14.0.0** (5 majors behind — abnormal, likely missing patches)
- `express@4.18.2` → 4.22.1 (1 major available)
- `pino@8.17.0` → 10.3.1 (2 majors behind)
- `prom-client@15.1.0` ✓ (current)

**Frontend — Minor gaps only:**
- React@18.3.1 (React 19.0.0 available, not urgent)
- react-router-dom@6.26.0 (minor versions behind)

---

### ✅ **Green Signals**

- ✅ **No GPL/AGPL licenses** (no viral license risk)
- ✅ **No post-install scripts** (zero arbitrary code execution during npm install)
- ✅ **No low-popularity dependencies** (<100 downloads/week)
- ✅ **No recent ownership transfers**
- ✅ **E2E tests clean** (no CVEs, just missing @playwright/test install)

---

### 📄 **Full Report**

A detailed markdown report has been created at:
```
Teams/TheInspector/findings/dependency-audit-2026-04-22.md
```

**Includes:**
- ✓ All 7 CVEs with CVSS scores and CWE classifications
- ✓ Dependency chain analysis (what pulls in each vulnerable package)
- ✓ Recommended upgrade paths with exact commands
- ✓ License compliance verification
- ✓ Supply chain risk assessment
- ✓ Cross-team escalation notes (to TheGuardians)
- ✓ JSON summary for dashboard integration

---

### 🎬 **Next Steps (Prioritized)**

1. **NOW** — Upgrade ts-jest to resolve P1 handlebars injection risk
2. **This sprint** — Upgrade vite, uuid, express (test for breaking changes)
3. **Next sprint** — Audit uuid@14.x, pino@10.x for compatibility

### 📚 **Knowledge Base Updated**

Learnings file updated at:
```
Teams/TheInspector/learnings/dependency-auditor.md
```

Includes watch list, metrics, and process notes for future audits.

---

Let me know if you'd like me to help with:
- ✓ Creating a remediation PR (upgrade ts-jest + vite)
- ✓ Detailed code review of test files for handlebars risks
- ✓ Compatibility testing plan for major version upgrades
