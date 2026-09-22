# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### First Audit: 2026-09-22

**Critical Vulnerabilities Discovered:**
1. **vitest RCE** (GHSA-5xrq-8626-4rwp) — UI server arbitrary file read/execution
   - Affects: Source/Frontend v4.1.10, portal/Backend v3.2.5
   - Fix: npm update vitest to v5.0.1+
   - Status: URGENT — P1 severity

2. **protobufjs RCE** (GHSA-xq3m-2v4x-88gg) — Arbitrary code execution via unsafe deserialization
   - Affects: portal/Backend (gRPC instrumentation)
   - Fix: npm update protobufjs to v7.7.0+
   - Status: URGENT — P1 severity, infrastructure-critical

3. **js-yaml DoS** (multiple GHSA) — Quadratic CPU consumption via merge-key chains
   - Affects: Source/Backend
   - Risk: User-controlled YAML parsing
   - Fix: npm update js-yaml to v3.15.2+

**High-Severity Patterns:**
- **brace-expansion DoS** (3 separate CVEs) — Exponential expansion attacks
- **browserslist memory exhaustion** — Build process DoS risk
- **@remix-run/router open redirect** — Frontend redirect bypass
- **vite path traversal** — Dev server file access bypass (Windows specific)

**Transitive Dependencies:**
- portal/Backend carries 22 transitive deps (OpenTelemetry instrumentation) — largest attack surface
- portal/Frontend has 17 transitive deps
- Source code projects are lean (3-13 deps each) — good hygiene

**Audit Tools Available:**
- npm audit --json ✓ (used successfully)
- npm outdated --json ✓ (used successfully)
- npm ls --json ✓ (available for tree analysis)
- license-checker: NOT installed; use `npx license-checker --json`
- govulncheck: NOT available (Go projects not present in main source)
- pip-audit: NOT applicable (no Python requirements.txt)

**Outdated Major Versions (Not CVEs):**
- express: 4.22.3 → 5.2.1 (1 major)
- pino: 8.21.0 → 10.3.1 (2 majors)
- react: 18.3.1 → 19.3.0 (1 major)
- react-router-dom: 6.30.6 → 7.18.4 (1 major)

**No Post-Install Scripts Detected** — Good supply chain hygiene

**License Compliance:**
- No GPL/AGPL detected in reviewed packages
- Standard MIT/Apache/ISC/BSD across projects
- Formal audit needed before production: `npx license-checker --json`

### Recommended Action Items
1. **Immediate:** Update vitest, protobufjs, js-yaml, brace-expansion (P1/P2)
2. **Short-term:** Update uuid (direct dependency buffer overflow), qs, body-parser, react-router-dom
3. **Monitor:** portal/Backend OpenTelemetry deps — consider pruning unused exporters
4. **Future:** Establish automated dependency scanning (Dependabot), monthly security reviews

### Watch List (Recurring CVE Packages)
- **brace-expansion** — 4 CVEs in <2 years; consider alternatives or monitor closely
- **js-yaml** — 4 DoS CVEs; quadratic complexity issues inherent to YAML merge specs
- **protobufjs** — Unusual concentration of high-severity vulnerabilities; evaluate gRPC necessity
- **vitest** — Active development; major version bumps required for security fixes (v3→5 already)
