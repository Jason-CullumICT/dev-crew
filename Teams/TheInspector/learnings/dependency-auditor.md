# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-08-24

#### Critical Vulnerabilities Found
- **Handlebars.js (7 CVEs):** JavaScript injection via AST type confusion, prototype pollution, decorator DoS. Versions 4.0.0-4.7.8 affected. Found in: Backend, Frontend, orchestrator, portal/Frontend.
- **protobufjs (1 CVE):** Arbitrary code execution. Version <7.5.5 affected. Found in: portal/Backend.
- **brace-expansion (4 CVEs):** Multiple DoS vectors (zero-step, exponential expansion, unbounded arrays). Version <=1.1.17 affected.
- **OpenTelemetry auto-instrumentations:** Prometheus exporter crash via malformed HTTP. Version <=0.76.0.

#### Supply Chain Risk Assessment
- **Largest dependency surface:** portal/Backend (578 transitive dependencies) — highest risk for supply chain attacks
- **No abandoned packages detected** — all CVEs in actively maintained projects
- **No license compliance issues** — all permissive licenses (MIT, Apache 2.0)
- **Build tool vulnerabilities are critical:** brace-expansion and js-yaml in dev pipeline can block builds or cause hangs

#### Environment Notes
- **npm audit tool status:** Available and working in all 10 projects
- **No Go/Python/Rust projects** detected in this repo
- **All projects use npm + package-lock.json** (workaround: `npm audit --json` requires lock file)
- **Major version gaps:** express 4→5, uuid 9→14, pino 8→10 (plan upgrades for next sprint)

#### Audit Methodology
- Scanned 10 npm projects across Source/, platform/, portal/, and demo directories
- Total: ~1,750+ transitive dependencies
- Used `npm audit --json` for CVE detection + manual severity assessment
- Cross-referenced OWASP categories for exploitability

#### Remediation Pattern
- Immediate fixes available via `npm audit fix --force` for most projects
- Breaking changes expected for: vite, @vitest/mocker, uuid (major), @opentelemetry/* (major)
- portal/Backend requires careful upgrade planning (55 vulnerabilities, largest tree)

#### Next Steps for Team
1. Run `npm audit fix --force` on all Source/* projects immediately
2. Test portal/Backend upgrades in staging first (most complex)
3. Plan major version upgrades (express, uuid, pino) for next sprint
4. Monitor Handlebars project for updates (7 active CVEs)
5. Red-team test the handlebars RCE and protobufjs RCE vectors
