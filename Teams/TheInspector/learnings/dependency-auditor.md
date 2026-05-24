# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-05-24 — First Comprehensive Audit
- **Critical findings:** 3 CVEs (handlebars, protobufjs x2)
- **High findings:** 5 CVEs (OpenTelemetry, path-to-regexp x2)
- **Moderate findings:** 35+ CVEs across all projects
- **Total vulnerabilities:** 43+

## Watch List (Recurring CVE Packages)

- **handlebars** — Multiple JavaScript injection CVEs (8 distinct issues found)
  - Affect: Source/Backend
  - Status: Requires investigation into why it's a transitive dependency
  - History: GHSA-2qvq-rjwj-gvw9, GHSA-3mfm-83xf-c92r, GHSA-2w6w-674q-4c4q, and 5 others
  
- **protobufjs** — Arbitrary code execution (CVSS 9.8)
  - Affect: platform/orchestrator, portal/Backend
  - Status: UNCONFIRMED — `npm ls` shows empty but npm audit flags it
  - Action: Verify if actually used; if transitive, identify path
  
- **path-to-regexp** — ReDoS via regex catastrophic backtracking
  - Affect: platform/orchestrator, portal/Backend (via express)
  - Status: Fixable via express@latest
  - History: GHSA-37ch-88jc-xwx2

- **OpenTelemetry SDK** — Prometheus exporter DoS
  - Affect: portal/Backend
  - Status: Direct dependency; update available
  - History: GHSA-q7rr-3cgh-j5r3

## Tools & Commands

**Available in this environment:**
- `npm audit --json` — Full JSON output
- `npm outdated` — Check for version updates
- `npm ls <pkg>` — Trace dependency tree (useful for finding false positives)
- License-checker not available — skipped license compliance phase

## License Decisions

No GPL/AGPL packages found; all dependencies MIT/Apache 2.0/BSD compatible. No legal review required yet.

## Key Insights

1. **Dev-time vs. Production Vulnerabilities:**
   - vite, vitest, esbuild vulnerabilities are build-time only; lower production risk
   - Consider separate CI gates: fail on critical/high in prod, allow moderate in dev

2. **Transitive Dependency Verification:**
   - Some npm audit findings don't appear in `npm ls` (handlebars, protobufjs)
   - Always verify with `npm ls <pkg>` when planning remediation
   - Lock files may contain orphaned entries from old installations

3. **Supply Chain Risk:**
   - portal/Backend has 120 transitive dependencies (above 100 threshold)
   - High surface area; consider dependency reduction audit

4. **Orchestrator Infrastructure:**
   - platform/orchestrator has critical CVEs (protobufjs ReDoS) 
   - High impact if exploited (manages Docker/agents)
   - Prioritize infrastructure security hardening

## Next Audit Action Items

- [ ] Trace handlebars path: why is it a transitive dep in Backend?
- [ ] Confirm protobufjs usage: is it actually installed or lock file artifact?
- [ ] Schedule OpenTelemetry SDK update (portal/Backend) with observability team
- [ ] Test path-to-regexp ReDoS fix with URL fuzzing
- [ ] Reduce transitive dependencies in portal/Backend (120 is high)
