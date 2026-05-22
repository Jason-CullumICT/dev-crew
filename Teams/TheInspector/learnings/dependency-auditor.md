# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-22

### Critical Findings (Watch List)

1. **handlebars** — Multiple RCE/XSS/DoS vulnerabilities (8 CVEs)
   - **Versions Affected:** 4.0.0 - 4.7.8
   - **Status:** FIXED (requires npm update in Source/Backend)
   - **Recurring Risk:** Monitor for new handlebars releases; this is a high-traffic package with history of injection vulnerabilities
   - **Mitigation:** If Backend uses templates from untrusted sources, implement a sandbox or use a safer template engine

2. **protobufjs** — Arbitrary Code Execution via prototype pollution (9 CVEs)
   - **Versions Affected:** <= 7.5.7
   - **Status:** CRITICAL (requires npm update in platform/orchestrator)
   - **Recurring Risk:** This package generates code from protobuf definitions. Any untrusted .proto input is exploitable
   - **Mitigation:** Validate .proto files before loading; consider using pinned proto definitions only

### Moderate Vulnerabilities (Track for Patterns)

- **esbuild, vite, vitest** (dev dependencies) — Usually auto-patched in minor updates
- **path-to-regexp** (router), **brace-expansion** (glob) — Common in many projects; coordinate updates across workspace
- **uuid** (utility) — Widely used; keep on latest stable version

### Audit Tools & Environment

- **Available Tools:**
  - ✅ `npm audit` — Fully functional, JSON output
  - ✅ `npm outdated` — Displays version comparisons
  - ❌ `npm license-checker` — Not installed; recommended for future audits
  - ❌ `govulncheck`, `pip-audit` — No Go or Python projects in dev-crew

- **Package Manager Matrix:**
  | Manager | Projects | Status |
  |---------|----------|--------|
  | npm | 4 main + 6 demo | ✅ Full audit possible |
  | Go modules | 0 | N/A |
  | Python pip | 0 | N/A |
  | Rust Cargo | 0 | N/A |

### License Compliance (Incomplete)

- No GPL/AGPL detected via npm audit
- **Recommendation:** Install `license-checker` and add as CI gate:
  ```bash
  npm install -g license-checker
  cd {project} && npx license-checker --json --onlyAllow "MIT,Apache-2.0,ISC,BSD"
  ```

### Dependency Tree Insights

- **Backend (412 transitive):** Heavy due to Express ecosystem
- **Frontend (231 transitive):** Heavy due to React + Vite toolchain
- **Orchestrator (156 transitive):** Moderate; pull in protobufjs (adds 30+ deps)
- **E2E (5 transitive):** Minimal; single test runner

**Recommendation:** Consider lightweight alternatives for Backend/Orchestrator:
- Hono (smaller footprint than Express)
- Drizzle ORM (lighter than Sequelize)

### Decision Log

- **2026-05-22:** Both P1 CVEs (handlebars, protobufjs) classified as ESCALATE → TheGuardians due to RCE risk in untrusted input scenarios
- **2026-05-22:** Recommended npm audit as CI gate with `--audit-level=high` to catch future P1/P2 findings early

### Next Audit Checklist

- [ ] Install `license-checker` and run license compliance gate
- [ ] Add `npm audit --workspaces --audit-level=high` to GitHub Actions
- [ ] Review handlebars, protobufjs, path-to-regexp fixes post-update
- [ ] Plan React 18→19 and Express 4→5 migration sprints
- [ ] Check for new CVEs in top 10 packages (most likely attack surface)

---

**Last Updated:** 2026-05-22  
**Next Review:** 2026-06-22 (30-day rolling audit)
