# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-25

### Critical CVEs Discovered
1. **Handlebars@4.7.8** — Multiple RCE vulnerabilities (CVSS 9.8/8.1/8.2)
   - Used in: Source/Backend (indirect)
   - Fix: Upgrade to >=4.7.9 immediately
   - Watch: If used for email/doc generation, this is exploitable

2. **Vitest@3.2.5** — Arbitrary file read + RCE when UI server is exposed (CVSS 9.8)
   - Used in: Source/Frontend (direct dev dependency)
   - Fix: Upgrade to >=3.2.6 then >=4.1.11
   - Watch: Never expose Vitest UI on network

3. **Protobufjs@7.6.4** — Arbitrary code execution via unsafe code generation (CVSS 9.8)
   - Used in: platform/orchestrator (indirect via gRPC)
   - Fix: Upgrade to >=7.7.0
   - Watch: Protobuf is a critical attack surface in orchestrator

### High-Severity CVE Patterns
- **DoS via unbounded expansion/recursion:** brace-expansion, js-yaml, nanoid, ws, gRPC
  - Root cause: Insufficient input validation on size/expansion parameters
  - Fix strategy: Upgrade all immediately

- **File read via sourceMappingURL:** @babel/core, postcss, vite
  - Root cause: Unvalidated comments in source files
  - Fix strategy: Build-time risk only (not prod), upgrade to latest

- **Open redirect in routing:** react-router, @remix-run/router
  - Root cause: Insufficient validation of redirect targets
  - Risk: Phishing attacks
  - Fix: Upgrade react-router-dom to 7.x (requires testing)

### Package Manager Insights
- **npm audit** is fully functional and returns JSON
- Exit code 1 when vulnerabilities found (not a failure)
- `npm outdated --json` works well for version checking

### Tools Available
- `npm audit --json` ✅ Works in all directories
- `npm outdated --json` ✅ Works for version comparison
- `npm update` ✅ Safe for patch/minor version updates
- `license-checker` ❌ Not installed (global npm package needed)

### Dependency Tree Analysis
- **Frontend has 96% transitive dependencies** (9 direct, 221 transitive)
  - Likely due to React ecosystem sprawl
  - Consider dependency tree optimization

- **Orchestrator has only 1% transitive** (153 direct, 2 transitive)
  - Good practice: Direct dependency management
  - Should be a model for other packages

### Outdated Packages (>1 Major Version Behind)
| Package | Backend | Frontend | Orchestrator | Priority |
|---------|---------|----------|--------------|----------|
| express | 4.22.1 | - | 4.22.1 | Low (LTS v4) |
| pino | 8.21.0 | - | - | Medium (2 major gap) |
| uuid | 9.0.1 | - | - | HIGH (has CVE, 5 major gap) |
| react | - | 18.3.1 | - | Medium (1 major gap) |
| react-dom | - | 18.3.1 | - | Medium (1 major gap) |
| react-router-dom | - | 6.30.6 | - | HIGH (has CVEs) |
| dockerode | - | - | 4.0.12 | Medium (1 major gap) |
| multer | - | - | 1.4.5-lts.2 | Low (stable LTS) |

## Learnings

- **Handlebars is a significant risk** — verify it's actually used before deciding on removal vs. upgrade
- **Vitest UI should never be exposed** — add to CI/CD security checklist
- **Protobufjs vulnerabilities are deep** — 10+ CVEs in single package, requires careful upgrade testing
- **Major version upgrades cascade** — vite/vitest/esbuild require coordinated testing; react/react-router need QA
- **Audit frequency:** Run weekly during active development; monthly in maintenance mode
- **Supply chain risk:** 941 transitive dependencies across all packages = attack surface

## Recommendations for Next Audit

1. Enable `npm audit fix` automation in CI/CD for patch-level updates
2. Create a quarterly "major version upgrade sprint" for planned upgrades
3. Implement license checking in CI/CD gate (use `license-checker`)
4. Monitor npm advisory feed for new CVEs in monitored packages (watch list below)
5. Schedule Vitest UI security review before production deployment

## Watch List (Recurring CVE Patterns)

- **Handlebars** — Monitor for future versions, consider alternative templating
- **Protobufjs** — Very active CVE feed, plan for frequent updates
- **React Router** — Multiple open redirects; keep up with 7.x releases
- **Express ecosystem** (body-parser, qs, multer) — DoS risks in each
- **Build tools** (vite, esbuild, postcss) — Regular security updates needed
