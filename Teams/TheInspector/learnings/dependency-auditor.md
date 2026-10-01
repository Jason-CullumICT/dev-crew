# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings from 2026-10-01 Audit

### Critical Findings Pattern
- **Handlebars** (4.7.8): JavaScript injection via AST type confusion (GHSA-2w6w-674q-4c4q)
  - Mitigation: Ensure handlebars always >= 4.7.9
  - Watch: Handlebars is a build-time tool; check CLI usage too (GHSA-xjpj-3mr7-gcpf)

- **Vitest** (4.1.10): Arbitrary file read when UI server listening (GHSA-5xrq-8626-4rwp)
  - Mitigation: Disable UI server in untrusted environments; upgrade to 3.2.6+
  - Watch: @vitest/mocker also affected (GHSA-82fw-gwwq-j7x9)

- **Protobufjs** (7.6.4): Arbitrary code execution (GHSA-xq3m-2v4x-88gg)
  - Mitigation: Update to 7.5.5+ immediately; orchestrator is critical infrastructure
  - Watch: 12+ related CVEs in this package; prototype pollution is gadget chain source

- **Portal Backend**: Supply chain risk (54 vulnerabilities, 2 critical, 11 high)
  - Root cause: No npm audit enforcement in CI/CD
  - Action: Implement npm audit gate before next build
  - Pattern: Build tools accumulate cruft; portal not isolated from main app

### High-Priority DoS Packages
- **brace-expansion**: Multiple DoS variants (exponential expansion, stack exhaustion, OOM)
  - Status: <=1.1.20 affected; fix available
  - Pattern: Common transitive dep via glob/minimatch; appears in 8+ places

- **browserslist**: Cache DoS + crash via malformed stats.json
  - Status: <=4.28.6 affected
  - Watch: Appears in both build and runtime chains

- **js-yaml**: Merge-key quadratic complexity DoS (4 CVEs)
  - Status: >=3.0.0 <3.15.2 affected; multiple backports needed
  - Pattern: YAML parsing from config files; validate early

### Frontend Outdated Packages
- **react@18.3.1 → 19.3.0**: 1 major version behind
  - Note: v18 still supported but v19 has hardening
  - Action: Plan for next release cycle; test component rendering

- **react-router-dom@6.30.6 → 7.18.4**: 1 major version behind
  - **SECURITY**: Contains open redirect CVE (GHSA-2j2x-hqr9-3h42) in v6
  - Action: Prioritize v7 upgrade; significant API changes
  - Watch: Protocol-relative URLs (`//example.com`) bypass same-origin check

### Build Tool Risks
- **Vite**: Path traversal in .map file handling (GHSA-4w7w-66w2-5vf9, GHSA-fx2h-pf6j-xcff)
  - Status: <=6.4.2 affected; major version bump to 8.x for fix
  - Pattern: Source maps are often output to web root; validate file paths

- **PostCSS**: Multiple path traversal via sourceMappingURL (3 CVEs)
  - Status: <=8.5.22 affected
  - Pattern: CSS source maps can read `/etc/passwd`, `.env`, etc.
  - Mitigation: Never output .map files to web-accessible directories

### Audit Tool Status
- `npm audit --json` working; npm CLI at v10.x
- No Go, Python, Rust, or Java projects in this repo
- All package.json files use npm (no yarn, pnpm)
- Lock files present and consistent

### Recommended CI/CD Gates
1. **Pre-commit**: `npm audit --severity=critical` (fail on critical only)
2. **CI/CD**: `npm audit --severity=high` (fail on high+)
3. **Weekly cron**: Full audit report + escalation on new P1/P2

### Monthly Review Checklist
- [ ] Run `npm audit` across all 10 projects
- [ ] Check for deprecated package notices (npm registry)
- [ ] Review new CVEs in GHSA for packages we use
- [ ] Verify no new transitive dependency bloat (>500 deps = red flag)
- [ ] Audit Portal Backend separately (highest-risk project)
