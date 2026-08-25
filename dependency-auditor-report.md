Perfect! Dependency audit complete. Here's the summary:

---

## 🔍 Dependency Auditor Report — 2026-08-25

### **Overall Finding: Grade C** ⚠️

Scanned **4 npm workspaces** with **941 total dependencies** (268 direct, 673 transitive)

### **Critical Issues Found: 3**
1. **Handlebars@4.7.8** — RCE via AST injection (CVSS 9.8) — Backend
2. **Vitest@3.2.5** — Arbitrary file read/RCE when UI exposed (CVSS 9.8) — Frontend dev
3. **Protobufjs@7.6.4** — Arbitrary code execution (CVSS 9.8) — Orchestrator

### **Vulnerability Breakdown**
- **Critical:** 3 (handlebars, vitest, protobufjs)
- **High:** 10 (brace-expansion, js-yaml, form-data, vite, postcss, nanoid, ws, gRPC, react-router, path-to-regexp)
- **Moderate:** 16 (body-parser, uuid, @babel/core, esbuild, etc.)
- **Low:** 2 (@babel/core sources)
- **Total CVEs:** 31 unique findings

### **Outdated Major Versions**
8 packages >1 major version behind:
- `pino` (8.21 → 10.3) — 2 major gap
- `uuid` (9.0 → 14.0) — 5 major gap, **has CVE**
- `react-router-dom` (6.30 → 7.18) — **has CVEs**
- Others: react, react-dom, express, dockerode, multer

### **Package-by-Package Grade**
| Package | Grade | Issues |
|---------|-------|--------|
| Source/E2E | **A** ✅ | 0 CVEs (4 deps, clean!) |
| Source/Backend | **C** | 9 CVEs (102 direct, 309 transitive) |
| platform/orchestrator | **C** | 9 CVEs (153 direct, 1% transitive — good!) |
| Source/Frontend | **D** | 13 CVEs (9 direct, 96% transitive — risky) |

### **Immediate Actions (Priority)**

#### 🔴 P1 — Fix Immediately
1. **Handlebars** — Identify usage; if for email/templates, upgrade or remove
2. **Vitest** — Update to 3.2.6+ (major version to 4.x); never expose UI in prod
3. **Protobufjs** — Update to 7.7.0+ (gRPC critical path)

#### 🟠 P2 — Fix This Sprint
- Brace-expansion, js-yaml, form-data (all HIGH CVSS)
- Vite/esbuild, PostCSS, nanoid, ws, gRPC
- React Router (multiple open redirect CVEs)

#### 🟡 P3 — Plan Next Iteration
- UUID major version upgrade (9 → 11+)
- React/React-DOM (1 major behind)
- Pino logging (2 majors behind)

### **Key Insights**
- **Frontend is 96% transitive deps** — large attack surface, consider tree-shaking
- **E2E is 100% clean** ✅ — only 4 direct, 0 transitive
- **Orchestrator has 153 direct deps but only 2 transitive** — excellent dependency management
- **Supply chain risk:** 941 dependencies = lots of third-party code

### **Report Files**
- 📄 **Full Report:** `Teams/TheInspector/findings/dependency-audit-2026-08-25.md` (2400+ lines)
  - Detailed CVE descriptions
  - Remediation steps
  - Cross-references to TheGuardians (RCE findings)
  - JSON summary & recommendations

- 📚 **Learnings Updated:** `Teams/TheInspector/learnings/dependency-auditor.md`
  - Watch list: handlebars, protobufjs, react-router, express ecosystem
  - Tools available (npm audit, outdated, etc.)
  - Audit frequency recommendation: weekly during active dev, monthly in maintenance

### **Pipeline Status**
✅ Reported to dashboard: `run-20260825-030539`

---

**Next Steps:**
1. **Team Lead:** Review P1 findings and create hotfix ticket for handlebars/vitest/protobufjs
2. **Backend Team:** Address Backend CVEs (9 total, mostly DoS risks)
3. **Frontend Team:** Plan React Router 7.x upgrade sprint + vitest fix
4. **Orchestrator Team:** gRPC + protobufjs upgrade testing

All findings cross-referenced and ready for TheGuardians security review of RCE risks.
