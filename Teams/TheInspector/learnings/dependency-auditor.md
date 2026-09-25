# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Baseline (2026-09-25)

### Critical Findings
- **vitest < 3.2.6**: RCE via UI server (GHSA-5xrq-8626-4rwp)
  - Current version ~4.1.10 is STILL VULNERABLE
  - Requires major version bump to 5.0.1+
  - Located in Source/Frontend/
  - Action: Deploy fix to staging before exposing portal

- **protobufjs < 7.5.5**: RCE via .proto parsing (GHSA-xq3m-2v4x-88gg)
  - Located in platform/orchestrator/
  - Multiple cascading CVEs in 7.x line (up to 7.6.4)
  - Action: Update to >=7.5.5 immediately

- **uuid < 11.1.1**: Buffer bounds check missing (GHSA-w5hq-g745-h8pq)
  - Located in Source/Backend (direct) and platform/orchestrator (transitive via dockerode)
  - Action: Ensure all uuid v3/v5/v6 calls use safe version

### High-Risk Packages (Watch List)
These packages have recurring/multiple CVEs and should be monitored closely:

1. **brace-expansion** — 4 DoS CVEs in <1.1.18 (glob expansion, memory exhaustion)
2. **js-yaml** — 3 DoS CVEs in <=3.15.1 (merge-key quadratic expansion)
3. **browserslist** — 2 CVEs in <=4.28.6 (memory leak + crash)
4. **vite** — 3 CVEs in <=6.4.2 (path traversal, fs.deny bypass)
5. **ws** — Memory exhaustion DoS in 8.0.0-8.20.1
6. **@grpc/grpc-js** — Repeated crash CVEs (1.14.0-1.14.3)
7. **protobufjs** — Repeated RCE + DoS CVEs in protobuf parsing
8. **@opentelemetry/auto-instrumentations-node** — Prometheus exporter crash

### Dependency Complexity
- **Total transitive:** ~800 dependencies (moderate risk surface)
- **Direct dependencies:**
  - Source/Backend: 102 direct, 411 transitive
  - Source/Frontend: 9 direct, 230 transitive
  - platform/orchestrator: 153 direct, 155 transitive
- **No post-install scripts found** (good sign)
- **No GPL/AGPL packages detected** (license compliant)

### Audit Tools Available
- `npm audit --json` — Full vulnerability scan with CVSS scores
- `npm outdated --json` — Major/minor version status
- `npx license-checker --json` — License compliance check
- ✅ All tools available in this environment

### Remediation Strategy
1. **Day 1 (Blockers):** vitest, protobufjs, uuid
2. **Day 2-3 (Urgent):** brace-expansion, js-yaml, browserslist, vite, ws, grpc-js, path-to-regexp, opentelemetry
3. **Day 4-5:** Staging test + deploy

### Automations to Implement
- [ ] Set up Dependabot/Renovate for automated patch PRs
- [ ] Add `npm audit` fail gate to CI (fail on critical/high)
- [ ] Schedule quarterly audits (next: 2026-12-25)
- [ ] Add license-checker to pre-commit hooks
- [ ] Monitor protobufjs, vitest, grpc-js GitHub advisories

### Lessons for Next Audit
1. **Transitive dependency risk is significant** — cascading vulnerabilities (uuid → dockerode, vite → vitest)
2. **Test infrastructure vulnerabilities are critical** — vitest RCE directly impacts CI/CD
3. **Orchestrator/platform deps need tight control** — grpc-js, protobufjs are high-risk infrastructure libs
4. **No post-install scripts is excellent** — maintains supply chain hygiene
5. **Major version bumps often required for CVE fixes** — vitest 4→5, some packages jump 2-3 majors

### Risk Tolerance
- **P1 (Critical):** ZERO TOLERANCE — blocks all deployments
- **P2 (High):** Remediate within 48-72 hours
- **P3 (Moderate):** Track in backlog, remediate in next planning cycle
- **P4 (Low):** Monitor, update on regular cadence (quarterly)

## Links & References
- npm audit docs: https://docs.npmjs.com/cli/v6/commands/npm-audit
- GitHub Advisory Database: https://github.com/advisories
- CVSS Score Reference: https://www.first.org/cvss/calculator/3.1
