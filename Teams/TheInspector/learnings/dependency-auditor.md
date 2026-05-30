# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run 2026-05-30

### Key Findings

**Critical Vulnerabilities (P1×2):**
1. **protobufjs ≤7.5.7** — Arbitrary code execution via malformed protobuf definitions (CVSS 9.8)
   - Location: platform/orchestrator (transitive via @google-cloud/* or gRPC)
   - Status: Requires manual upgrade; npm audit fix may not catch it
   - Fix: `npm install protobufjs@^7.5.8`

2. **handlebars 4.0.0–4.7.8** — JavaScript injection via AST type confusion (CVSS 9.8)
   - Location: Source/Backend (if used for server-side templating)
   - Status: Unknown if actually used; need to grep Source/ for handlebars import
   - Fix: Upgrade to 4.7.9+

**High Vulnerabilities (P2×5):**
- path-to-regexp ReDoS (CWE-1333) — orchestrator routing
- picomatch ReDoS (CWE-1333) — portal/Frontend file watching
- OpenTelemetry metrics exporter crash (CWE-755) — portal/Backend observability
- uuid buffer overflow (when buf provided) — all backends
- qs query string DoS (CWE-476) — all express services

### Environment Observations

- **npm versions:** Monorepo with 5+ package.json files, ~700–1100 transitive deps total
- **Lock files:** Present in all dirs; 6+ months old (not recently refreshed)
- **npm audit tool:** ✅ Available, can parse JSON output
- **Dependencies not installed:** Exit code 1 on `npm ls` — dev environment missing installs
- **No Go/Python/Rust:** Only npm packages detected

### Audit Tools Available
- ✅ `npm audit --json` — primary tool, reliable JSON output
- ⚠️ `npm outdated` — requires `npm install` first
- ⚠️ `npm list` — requires `npm install` first
- ❌ `license-checker` — not in PATH
- ❌ `govulncheck` — no Go modules
- ❌ `pip-audit` — no Python projects

### Watch List (Recurring CVEs)

These packages have had multiple CVEs; flag future audits:
- **handlebars** — 8 distinct CVEs detected in single version range
- **protobufjs** — 9 distinct CVEs in same version range
- **picomatch** — ReDoS pattern; similar to brace-expansion
- **vite / esbuild** — Build tool chain has repeated CORS/traversal issues
- **uuid** — Multiple buffer management issues across v3/v5/v6

### License Compliance Notes

- Cannot run `license-checker` without `npm install`
- No GPL/AGPL packages detected in direct deps (all MIT/ISC/Apache-2.0)
- Recommend: Add `npx license-checker --json --production` to CI/CD gates
- **No viral license risk detected** in current snapshot

### Remediation Experience

**npm audit fix Limitations:**
- Fixes Moderate/Low automatically if patch versions exist
- Does NOT fix Major version breaks (e.g., uuid 9→14, protobufjs stalled)
- Does NOT fix transitive-only vulns if direct dep doesn't have fix
- Requires `--force` flag to upgrade major versions (risky)

**Recommended Workflow:**
1. Run `npm audit --json` per workspace
2. Triage by severity (P1/P2 require manual review)
3. Test major upgrades in CI before merging
4. Pin exact versions of critical packages (protobufjs, uuid)

### Prior Findings

_(none yet — this is first audit)_

---

## Monitoring & Next Audit

**Next scheduled:** 2026-06-27 (monthly)  
**Triggers for emergency audit:**
- npm advisory for P1 CVE in protobufjs, uuid, express
- New handlebars/vitest P1 advisory
- `npm audit` output changes severity count

**Baseline (2026-05-30):**
- P1: 2 (critical)
- P2: 5 (high)
- P3: 11 (moderate)
- Total: 18 unique vulnerabilities across workspaces

**Success metric:** All P1/P2 remediated by 2026-06-07, audit grade improves to B+.
