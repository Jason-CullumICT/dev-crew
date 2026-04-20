## Dependency Auditor Report: Complete ✅

I've completed a comprehensive dependency security audit across all 6 npm workspaces in your dev-crew project. Here's the executive summary:

---

### **Critical Findings**

| Finding | Severity | Packages Affected | Action |
|---------|----------|-------------------|--------|
| **JavaScript Injection via Handlebars** | P1 (Critical) | Source/Backend (transitive) | Upgrade to ≥4.7.9; requires npm audit fix --force |
| **Arbitrary Code Execution (Protobufjs)** | P1 (Critical) | platform/orchestrator, portal/Backend | Upgrade to ≥7.5.5 immediately |
| **ReDoS in path-to-regexp** | P2 (High) | platform/orchestrator, portal/Backend | Upgrade to ≥0.1.13 |
| **ReDoS in picomatch** | P2 (High) | portal/Frontend (transitive via vite) | Upgrade to ≥2.3.2 / ≥4.0.4 |

### **Vulnerability Summary**
- **Total CVEs:** 21 (3 critical, 3 high, 15 moderate, 0 low)
- **Outdated Major Versions:** 6 direct dependencies (express, pino, react, react-router, uuid, multer)
- **License Issues:** ✅ CLEAN — all MIT/Apache 2.0/BSD permissive
- **Abandoned Packages:** ✅ NONE — all actively maintained
- **Overall Grade:** **C** (exceeds B threshold due to 3 P1 + 3 P2 vulns)

### **Supply Chain Health: LOW RISK**
- 22 direct dependencies, ~2,131 transitive total
- No duplicate major versions
- No single-maintainer high-risk packages
- No post-install scripts

---

### **Key Findings**

**P1 Critical (Immediate):**
- **Handlebars RCE** — 8 CVEs (CVSS 3.7–9.8) if untrusted templates compiled server-side
- **Protobufjs RCE** — Arbitrary code execution if untrusted proto files parsed

**P2 High (This Sprint):**
- **path-to-regexp ReDoS** — DoS attack on route matching with malformed parameters
- **picomatch ReDoS** — Catastrophic backtracking in glob patterns (dev-time impact)

**P3 Moderate:**
- **Vite path traversal** — Dev-server only; affects source map handling
- **Esbuild dev server SSRF** — Dev-only; allows cross-site request forgery
- **Brace-expansion DoS** — Malformed brace patterns cause hangs

---

### **Detailed Report**
- **Full findings:** `Teams/TheInspector/findings/dependency-audit-2026-04-20.md`
- **Learnings & watch list:** `Teams/TheInspector/learnings/dependency-auditor.md`

### **Recommended Next Steps**
1. **Escalate P1 findings to TheGuardians** for exploit assessment (handlebars + protobufjs)
2. **Run `npm audit fix`** on Source/Backend to resolve handlebars
3. **Upgrade protobufjs@7.5.5** in orchestrator and portal/Backend
4. **Coordinate major version upgrades** (express, react, react-router) in a single PR
5. **Re-audit in 30 days** to confirm fixes and detect new vulns

---

**Report Status:** ✅ Complete  
**Audit Agent:** dependency-auditor (Haiku)  
**Date:** 2026-04-20
