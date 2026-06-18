# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

**Last Updated:** 2026-06-18

---

## Critical Watch List

### MUST-MONITOR Packages (RCE/DoS Risk)
- **protobufjs** <7.5.5 — Arbitrary code execution (GHSA-xq3m-2v4x-88gg)
  - Used by: platform/orchestrator via @grpc/grpc-js
  - Action: Pin >=7.5.5, re-audit quarterly
  
- **vitest** <3.2.6 — File disclosure + RCE when UI exposed (GHSA-5xrq-8626-4rwp)
  - Used by: Source/Frontend, portal/Frontend
  - Mitigation: Never use --ui in CI/prod; disable via config
  
- **vite** <=6.4.2 — Path traversal + fs.deny bypass (GHSA-fx2h-pf6j-xcff)
  - Cascades through esbuild + @vitest/mocker
  - Action: Upgrade to 8.x (fixes 4+ CVEs)
  
- **@opentelemetry/* ecosystem** — 10+ cascading moderate/high CVEs
  - Heavy duplication in platform/orchestrator (12+ copies of @opentelemetry/core)
  - Action: Keep auto-instrumentations-node >=0.77.0
  - Risk: Consider monorepo lock strategy to deduplicate

### HIGH-PRIORITY Security Updates
- **@grpc/grpc-js** >=1.14.4 — Server crash from malformed requests
- **react-router-dom** >=6.30.4 — Open redirect via protocol-relative URLs
- **form-data** >=4.0.6 — CRLF injection in multipart headers
- **ws** >=8.21.0 — Memory exhaustion DoS
- **uuid** >=11.1.1 — Buffer overflow when custom buf provided (source/backend uses ^9.0.0)

---

## Audit Tools & Availability

### Working Tools
- ✓ **npm audit --json** — 30 seconds, comprehensive, accurate
  - Command: `cd {module} && npm audit --json`
  - Best for: CVE detection, severity classification
  
- ✓ **npm outdated --json** — Shows major version gaps
  - Useful for: Identifying old packages (1+ major versions behind)
  
### Not Available
- ✗ **license-checker** — Not in PATH or globally installed
  - Fallback: Parse package.json license fields manually
  
- ✗ **govulncheck** (Go) — No Go modules in project
- ✗ **pip-audit** (Python) — No Python requirements in project

---

## Codebase-Specific Findings

### Dependency Distribution
| Module | Prod | Dev | Transitive | CVEs |
|--------|------|-----|------------|------|
| Source/Backend | 102 | 310 | 412 | 27 (1C, 1H, 24M, 1L) |
| Source/Frontend | 9 | 222 | 231 | 11 (1C, 3H, 6M, 1L) |
| Source/E2E | 4 | 0 | 4 | 0 |
| portal/Backend | 3 | 1 | 4 | 0 |
| portal/Frontend | 9 | 416 | 425 | 11 (1C, 4H, 5M, 1L) |
| platform/orchestrator | 80+ | 150+ | 230+ | 15+ (multiple critical) |

**Key Insight:** Most CVEs in frontend (vitest, vite, ws, form-data) and orchestrator (protobufjs, gRPC, OTel).

### Outdated Major Versions
- **express** 4.18.2 (latest 5.2.1, 1 major behind)
- **pino** 8.17.0 (latest 10.3.1, 2 majors behind)
- **uuid** 9.0.0 (latest 14.0.0, 5 majors behind) — **SECURITY RISK**
- **vite** 5.4.0 & 6.4.2 (latest 8.x, 2-3 majors behind) — **CVE-CRITICAL**
- **react** 18.3.1 (latest 19.2.7, 1 major behind)
- **react-router-dom** 6.26.0 (latest 7.18.0, 1 major behind)

**Recommendation:** Prioritize vite 8.x (fixes cascading CVEs) and uuid patch/major upgrade.

---

## License Status

✓ **All dependencies use permissive licenses** (MIT, Apache 2.0, ISC, BSD)
✓ **No GPL/AGPL/SSPL detected** in primary dependencies
✓ **No license compliance blocker** as of 2026-06-18

---

## False Positives & Known Quirks

- npm audit occasionally double-counts transitive deps (normal)
- Some "fixAvailable" entries require major version bumps (tracked separately)
- @opentelemetry duplication is due to independent tooling (observability, logging, metrics); not consolidatable without architectural change

---

## Audit Rhythm Recommendation

- **Before release:** `npm audit` all modules, flag any P1/P2
- **Weekly:** `npm outdated` to track drift
- **Monthly:** Full audit + supply chain analysis
- **Quarterly:** License compliance + abandoned package check

---

## Learnings Log

| Date | Finding | Action Taken |
|------|---------|--------------|
| 2026-06-18 | 3 critical CVEs (protobufjs RCE, vitest RCE, OTel DoS) | Escalated to TheGuardians; flagged URGENT |
| 2026-06-18 | vite 8.x missing (2-3 major versions old) | Scheduled vite upgrade for this week |
| 2026-06-18 | @opentelemetry 12+ duplicates in orchestrator | Noted for future consolidation sprint |
| 2026-06-18 | uuid buffer overflow in backend | Flagged for patch or major upgrade decision |
| 2026-06-18 | form-data CRLF injection in frontend | Low risk but needs patch; escalate to TheGuardians |
