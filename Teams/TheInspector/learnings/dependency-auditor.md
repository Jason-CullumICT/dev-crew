# Dependency Auditor Learnings
**Last Updated:** 2026-04-20

## Audit Tools Available in This Environment

### npm Audit
- ✅ Available and working
- Command: `npm audit --json` in each workspace directory
- Lock files are the source of truth (package-lock.json)
- JSON output is machine-parseable for integration

### npm Outdated
- ✅ Available and working
- Command: `npm outdated --json` to check for version updates
- Does NOT require npm install to work against lock files

### npm License Checker
- ⚠️ Not required — npm audit includes license info
- `npx license-checker --json` available if needed for detailed license reporting

## Workspace Inventory

| Workspace | Path | Type | Focus |
|-----------|------|------|-------|
| Backend | Source/Backend/ | Express + TypeScript | API server, core logic |
| Frontend | Source/Frontend/ | React 18 + Vite | Web UI |
| E2E | Source/E2E/ | Minimal deps | End-to-end tests |
| Orchestrator | platform/orchestrator/ | Express + Docker | Agent orchestration (infra) |
| Portal Backend | portal/Backend/ | Express + OpenTelemetry | Developer portal backend |
| Portal Frontend | portal/Frontend/ | React 18 + Vite | Developer portal UI |

## Recurring Vulnerabilities & Watch List

### Vite/Esbuild Chain
- **Issue:** Vite ≤6.4.1 has path traversal; esbuild ≤0.24.2 has dev server SSRF
- **Status:** Development-only; low production risk
- **Action:** These are test/build dependencies — update during dependency maintenance windows
- **Known Versions:**
  - Source/Frontend: vite@5.4.0 (vulnerable)
  - portal/Frontend: vite@5.2.0 (vulnerable)
  - Recommend vite@≥8.0.9 for all

### Handlebars JavaScript Injection
- **Issue:** Found in Source/Backend dependency tree (transitive)
- **Status:** P1 Critical — RCE vector if untrusted templates compiled
- **Action:** If using handlebars, must upgrade to ≥4.7.9 or ≥5.0
- **Verification:** Trace back which package requires handlebars (likely jest or babel plugin)

### Protobufjs Arbitrary Code Execution
- **Issue:** Found in platform/orchestrator and portal/Backend
- **Status:** P1 Critical — RCE if untrusted proto files parsed
- **Action:** Ensure protobufjs@≥7.5.5 in all projects
- **Last Verified:** 2026-04-20 (vulnerability confirmed in versions <7.5.5)

### Path-to-Regexp ReDoS
- **Issue:** Affects route matching in Express-based servers
- **Status:** P2 High — DoS vector on malformed routes
- **Known Locations:** platform/orchestrator, portal/Backend
- **Fix:** Ensure path-to-regexp@≥0.1.13

## License Compliance Decisions

### Decision: MIT-only Enforcement Not Required
- **Rationale:** Project has no GPL dependencies; clean license profile
- **Policy:** Allow Apache 2.0, BSD, ISC alongside MIT (all permissive)
- **Action:** Block: GPL, AGPL, SSPL, Elastic License (not in scope for this project)

### Decision: @types Packages Always Okay
- **Rationale:** TypeScript type definitions are dev-only; MIT licensed
- **Policy:** No license review needed for @types/* packages
- **Action:** Treat as build dependencies, not distribution dependencies

## Audit Tool Availability

### Fully Working
- `npm audit --json` — ✅ direct
- `npm outdated --json` — ✅ direct
- `npm ls <package>` — ✅ traces dependencies

### Not Needed
- `govulncheck` (no Go projects detected)
- `pip-audit` (no Python projects detected)
- `cargo audit` (no Rust projects detected)

## Grading Thresholds Used

From `inspector.config.yml`:
- **A Grade:** max P1: 0, max P2: 3
- **B Grade:** max P1: 0, max P2: 8
- **C Grade:** max P1: 2, max P2: 15
- **D Grade:** max P1: 999 (fail)
- **F Grade:** Exploitable auth bypass + critical domain failure

**Current Status:** Grade C (3 P1 critical, 3 P2 high, 15 P3 moderate)

## Escalation Protocol

### TheGuardians (Security Team)
When to escalate dependency findings:
- **Handlebars RCE:** If app compiles untrusted templates → CRITICAL ESCALATE
- **Protobufjs RCE:** If app accepts untrusted proto definitions → CRITICAL ESCALATE
- **Path-to-Regexp ReDoS:** If public-facing API has user-controlled routes → HIGH ESCALATE

### TheFixer (Bug Fix Team)
- Outdated major versions (express, react, etc.) → file tickets for regular sprint
- Moderate vulns in dev dependencies (vite, vitest) → update in next dependency maintenance

## Prior Audit Findings & Resolution

### 2026-04-20 (Initial Audit)
- **P1:** handlebars (critical RCE), protobufjs (critical RCE) — requires escalation
- **P2:** path-to-regexp (ReDoS), picomatch (ReDoS) — needs fixes
- **P3:** vite (path traversal), esbuild (SSRF), brace-expansion (DoS), outdated majors
- **Action:** Pending npm audit fix runs and escalation to TheGuardians

## Future Audit Recommendations

1. **Monthly cadence:** Run npm audit on all 6 workspaces
2. **Auto-fix P3 dev-only:** Set up GitHub Actions to auto-merge patch updates
3. **Manual review P1–P2:** Require human verification before applying security patches
4. **Dependency graph visualization:** Consider adding `npm ls --graph` output to future audits
5. **Supply chain provenance:** Investigate npm package provenance (sigstore) for P1 packages

---

**Next Review Date:** 2026-05-20  
**Last Updated By:** dependency-auditor (Haiku)  
**Status:** Ready for follow-up audit
