# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-18

### Critical Findings
1. **protobufjs** (platform/orchestrator): 10+ CVEs including arbitrary code execution (GHSA-xq3m-2v4x-88gg)
   - **Action Required:** Upgrade to >=7.7.0 immediately
   - **Risk:** If orchestrator processes untrusted .proto definitions, RCE is possible
   - **Mitigation:** Validate/sandbox all proto file sources

2. **handlebars** (Source/Backend): JavaScript injection via AST confusion (GHSA-2w6w-674q-4c4q)
   - **Action Required:** Upgrade to >=4.7.9 immediately
   - **Risk:** Remote code execution if user-supplied templates are compiled
   - **Mitigation:** Never compile untrusted template strings

3. **vitest** (Source/Frontend): Arbitrary file read when UI server listening (GHSA-5xrq-8626-4rwp)
   - **Action Required:** Upgrade to >=3.2.6 immediately
   - **Risk:** Full filesystem disclosure if vitest UI is exposed on shared networks
   - **Mitigation:** Do NOT run vitest UI server in CI pipelines

### Supply Chain Health
- ✅ No post-install scripts detected (good — eliminates common build-time attack vector)
- ❌ ~800 total dependencies creates high surface area for vulnerabilities
- ⚠️ Infrequent dependency updates (multiple packages 2+ major versions behind)
- ⚠️ Three P1 vulnerabilities without mitigations = Grade D rating

### Outdated Packages Watch List
- **express** (3 major versions behind): Backend, Orchestrator
- **pino** (2 major versions behind): Backend logging
- **uuid** (5 major versions behind): Both projects (also has CVE-GHSA-w5hq-g745-h8pq)
- **react** (1 major version behind): Frontend
- **react-router-dom** (1 major version behind): Frontend (multiple open redirect CVEs)

### Package Manager Coverage
- ✅ npm: 6 projects scanned
- ❌ Go modules: Not used
- ❌ Python/pip: Not used
- ❌ Rust/Cargo: Not used
- ❌ Java/Maven: Not used

### Audit Tools Available
- `npm audit --json` ✅ Available and working
- `npm outdated --json` ✅ Available and working
- License checker (`npx license-checker`) — not tested yet
- `govulncheck` — Go not used in this project

### Recommendations for Team
1. **Immediate (Today):**
   - Update protobufjs, handlebars, vitest to fix P1s
   - Run `npm audit fix` on all projects
   - Add a security gate to block PRs with new P1/P2 vulnerabilities

2. **This Week:**
   - Schedule major version upgrade plan (express, uuid, react, react-router-dom)
   - Enable Dependabot or Renovate for automated security PRs
   - Add npm audit to CI pipeline

3. **Ongoing:**
   - Run dependency audit every 2 weeks
   - Track critical CVE release dates
   - Maintain a list of "known acceptable risks" (e.g., old @babel/core — low risk if transpilation is offline)

### License Compliance
- Not yet audited in this run (could add `npx license-checker` in future runs)
- No GPL/AGPL licenses flagged so far
- Recommend adding license check to CI if not already present

## Prior Run History
_(none — this is the first audit run)_
