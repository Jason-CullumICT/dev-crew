# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### Run 2026-08-26 (Initial Audit)

**Status:** Grade C — 5 critical CVEs, 90 total CVEs across workspaces

**Critical Findings Watch List:**
1. **vitest@<=3.2.5** — CRITICAL RCE via UI server (GHSA-5xrq-8626-4rwp, CVSS 9.8)
   - Affects: Source/Frontend, portal/Frontend
   - Status: OPEN — requires major version bump to 4.1.11+
   - Next Action: Test suite validation after upgrade

2. **@opentelemetry/* chain** — 10 HIGH CVEs + 2 CRITICAL in portal/Backend
   - DoS via malformed HTTP (metrics endpoint)
   - Status: OPEN — versions 2 years behind (0.40.3 → 0.79.0)
   - Next Action: Staged rollout; test OTel exports post-upgrade

3. **uuid@9.0.0** — Buffer overflow (GHSA-w5hq-g745-h8pq, CVSS 7.5)
   - Affects: Source/Backend (direct dependency)
   - Status: OPEN — upgrade to 14.0.2 needed
   - Next Action: Check UUID usage for security-critical paths

4. **brace-expansion** — 4 DoS CVEs (exponential, OOM, regex)
   - Affects: All workspaces (transitive via build tools)
   - Status: OPEN — requires toolchain cascade update
   - Next Action: `npm audit fix` + manual verification

**Outdated Packages (2+ major versions behind):**
- `pino`: 8.17.0 → 10.3.1 (Source/Backend)
- OpenTelemetry ecosystem: 39-174 version delta (portal/Backend)

**Supply Chain Surface:**
- portal/Backend: 577 transitive deps (HIGH risk)
- portal/Frontend: 424 transitive deps (HIGH risk)
- Source/E2E: 4 deps (CLEAN ✓)

**Post-Install Scripts:** None detected ✓

**License Compliance:** CLEAR — No GPL/AGPL violations

**Demo Projects:** abac-* are scaffolds, isolated from app — low priority

## Audit Tools Availability

- ✓ npm audit (JSON mode)
- ✓ npm outdated (JSON mode)
- ✗ license-checker not installed (fallback: manual package.json inspection)
- ✗ govulncheck not found (Go projects: none in scope)
- ✗ pip-audit not found (Python projects: none in scope)

## Recurring Issues

**Known to Require Follow-up:**
1. OpenTelemetry major version lag — expected; ecosystem moves fast
2. Frontend framework drift (React 18→19) — manageable, not blocking
3. Build toolchain DoS CVEs — monitor brace-expansion, nanoid, picomatch
4. Vite & vitest maturity — fast-moving projects, frequent patches

## Grading Rationale (Grade C)

- **P1: 3 findings** (Vitest RCE, OTel DoS, UUID overflow) → exceeds A/B threshold
- **P2: ~20 findings** (high CVEs, major version lags) → exceeds B threshold
- **P3: ~30 findings** (moderate CVEs, minor version lags)
- **Spec Coverage:** Unknown (not measured in this audit)
- **Verdict:** Grade C per `inspector.config.yml`: `max_p1: 2` (we have 3), `max_p2: 8` (we have ~20)
