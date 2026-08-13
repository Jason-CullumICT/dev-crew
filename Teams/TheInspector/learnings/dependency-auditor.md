# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-08-13 Findings

### Critical Vulnerabilities Discovered
1. **protobufjs (portal/Backend)** — RCE via arbitrary code execution (CVSS 9.8)
   - Affects serialization/deserialization of untrusted protobuf data
   - Fix: Update to 6.11.23+
   - Status: Blocking deployment of portal/Backend

2. **vitest (4 workspaces)** — Arbitrary file read when UI server is listening (CVSS 9.8)
   - Source/Frontend, portal/Backend, portal/Frontend, platform/orchestrator
   - Fix: Update to 3.2.6+ OR never run UI server in non-local environments
   - Status: Dev-only but critical in shared environments

3. **handlebars (Source/Backend)** — JavaScript injection via AST type confusion (CVSS 9.8)
   - Template processing can be exploited if user-controlled template names used
   - Fix: Update to 4.7.9+
   - Status: Blocking Source/Backend deployment

### High-Risk Packages (Recurring Issues)
- **postcss** — Multiple file read CVEs via sourceMappingURL (affects build pipeline)
- **vite/esbuild** — Path traversal and fs.deny bypass (dev server security)
- **react-router-dom** — Multiple open redirect CVEs (client-side routing)
- **form-data** — CRLF injection in multipart handling
- **js-yaml** — DoS via merge key expansion
- **brace-expansion** — DoS via unbounded expansion (transitive, hard to avoid)

### Workspace Risk Assessment
| Workspace | Risk Level | Critical | Action |
|-----------|-----------|----------|--------|
| portal/Backend | 🔴 CRITICAL | 2 | Update protobufjs, vitest immediately |
| Source/Backend | 🟠 HIGH | 1 | Update handlebars, brace-expansion |
| Source/Frontend | 🟠 HIGH | 1 | Update vitest, vite, react-router-dom |
| platform/orchestrator | 🟠 HIGH | 1 | Update vitest, vite |
| portal/Frontend | 🟠 HIGH | 1 | Update vitest, postcss |
| abac-* projects | 🟡 MEDIUM | 0 | Update vite, postcss, nanoid |
| Source/E2E | ✅ CLEAN | 0 | Monitor only |

### Audit Tooling Notes
- **npm audit** is the primary scanner (all workspaces have package-lock.json)
- **npx license-checker** not available in this environment (manual review needed)
- **govulncheck** not needed (no Go modules found)
- **pip-audit** not needed (no Python requirements.txt found)
- All found vulnerabilities are in npm/JavaScript ecosystem

### Remediation Strategy
1. **Immediate (48h):** Fix P1 critical vulnerabilities (protobufjs, handlebars, vitest)
2. **Short-term (1w):** Update all P2 high-severity packages
3. **Medium-term (2w):** Address P3 moderate vulnerabilities
4. **Ongoing:** Implement CI pipeline checks (`npm audit` blocking on critical/high)

### Watch List for Future Audits
- **protobufjs** — History of multiple RCE CVEs; this family is high-risk
- **vitest** — Test infrastructure is critical; monitor UI server security
- **postcss/vite/esbuild** — Build-chain tools attract supply-chain attacks
- **react-router** — Multiple recent CVEs; keep closely monitored

### Dependency Ecosystem Notes
- **Build tools (Vite/Esbuild/PostCSS):** High churn, frequent CVEs. Isolate dev environments.
- **Testing (Vitest/Jest):** UI servers are dangerous; never expose beyond localhost.
- **Routing (React Router):** Frequent open redirect fixes; stay current.
- **Transitive load:** Frontend has 230+ transitive deps; risk surface is large.

### Next Actions
1. Coordinate with TheGuardians on protobufjs RCE (may be exploitable depending on untrusted data handling)
2. Coordinate with TheFixer for bulk package updates
3. Add `npm audit --audit-level=high` to CI pipeline (block on violations)
4. Schedule monthly CVE rescans (2026-09-13)
