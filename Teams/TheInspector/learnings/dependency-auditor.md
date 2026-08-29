# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-29

### Critical Findings Summary
- **Total Vulnerabilities:** 99 (5 critical, 26 high, 62 medium, 6 low)
- **Worst Package:** portal/Backend (55 total, 2 critical)
- **Best Package:** Source/E2E (0 vulnerabilities) ✅

### Watch List: Recurring High-Risk Packages
1. **Handlebars.js** (>=4.0.0 <=4.7.8)
   - Multiple JavaScript injection CVEs (CVSS 9.8)
   - Chain: Source/Backend via unknown transitive
   - Fix: Update to 4.7.9+
   - Status: **CRITICAL — RCE risk**

2. **protobufjs** (<7.5.5)
   - Arbitrary code execution + prototype pollution
   - Chain: portal/Backend via @opentelemetry packages
   - Fix: Update OpenTelemetry packages to latest
   - Status: **CRITICAL — RCE risk**

3. **Vitest** (<3.2.6)
   - Arbitrary file read/execution via UI server
   - Direct: Source/Frontend
   - Fix: `npm update vitest`
   - Status: **CRITICAL — dev-time RCE**

4. **form-data** (4.0.0-4.0.5)
   - CRLF injection in multipart headers
   - Affects: Source/Backend, Source/Frontend, portal/Frontend
   - Fix: `npm update form-data`
   - Status: **HIGH — request header injection**

5. **brace-expansion** (<1.1.18)
   - DoS via multiple patterns (zero-step, exponential, unbounded)
   - Affects: Source/Backend (indirect)
   - Status: **HIGH — DoS in glob parsing**

6. **nanoid** (<3.3.18)
   - Infinite loop with negative/zero size
   - Affects: Source/Frontend, portal/Frontend
   - Status: **HIGH — availability risk**

7. **@opentelemetry** ecosystem
   - Baggage propagation DoS + Prometheus exporter crash
   - Heavy in portal/Backend (397 prod deps → 577 total)
   - Status: **HIGH — debug portal infrastructure**

### Audit Tool Availability
- ✅ **npm audit --json** works on all npm packages
- ✅ **npm outdated --json** works (shows version info)
- ❌ **license-checker**: not installed; manual parse of package.json sufficient
- ❌ **Go/Python/Rust auditors**: no Go/Rust/Python packages found in this project

### Environment Notes
- All packages are **npm/Node.js only** — no polyglot setup
- **License compliance:** All direct deps are MIT/Apache-2.0 (permissive)
- **No GPL/AGPL risk** detected

### Dependency Metrics & Patterns
- **Source/Backend:** 102 prod deps, 411 total (heavy)
- **Source/Frontend:** 9 prod deps, 230 total (bloated dev deps)
- **portal/Backend:** 397 prod deps, 577 total (VERY HEAVY — over-engineered for debug UI)
- **Source/E2E:** 4 prod deps, 4 total (clean)
- **Total Across All:** 674 prod, 1,797 transitive

**Observation:** portal/Backend dependency tree is suspicious — 397 production dependencies for a debug portal. Suggests unnecessary OpenTelemetry/gRPC cruft. Recommend pruning.

### Remediation Priority
**Tier 1 (RCE — Fix immediately):**
- vitest (Source/Frontend)
- handlebars chain (Source/Backend) — need to find root
- protobufjs → OpenTelemetry (portal/Backend)

**Tier 2 (DoS/Injection — Fix within 1 week):**
- form-data (all)
- brace-expansion (Source/Backend)
- nanoid (Source/Frontend, portal/Frontend)
- @grpc/grpc-js crash (portal/Backend)

**Tier 3 (Minor drift — Fix within 2 weeks):**
- React version updates (portal/Frontend)
- OpenTelemetry core baggage DoS (portal/Backend)

### Team Coordination Notes
- **[ESCALATE → TheGuardians]:** 5 critical vulns, especially handlebars & protobufjs RCE
- **[NOTE platform/ dir]:** orchestrator has 9 vulns; infrastructure-only, read-only for team agents
- **[TODO solo session]:** Consider platform/ updates separately

### Next Steps
1. Identify root cause of handlebars in Source/Backend (npm list handlebars)
2. Run staged npm update for each critical CVE
3. Re-audit after updates
4. Add `npm audit --audit-level=high` to CI/CD pre-push
5. Weekly audit cycle (cron or manual reminder)

### Tools & Commands for Next Audit
```bash
# Full audit summary
npm audit --json | jq '.metadata.vulnerabilities'

# Find specific package chain
npm list {package-name}

# Update with testing
npm update {package-name} && npm test && npm run build

# Re-audit
npm audit --json > audit-new.json
diff audit-old.json audit-new.json
```
