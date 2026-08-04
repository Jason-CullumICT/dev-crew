# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-04

### Critical Findings

**Vitest UI Server RCE (GHSA-5xrq-8626-4rwp)**
- Affects: Frontend dev dependencies (vitest@2.0.5)
- Impact: If UI server exposed, arbitrary file read + code execution
- Status: Requires major version upgrade (4.1.10+)
- Lesson: Test framework security matters in CI/CD — ensure UI server disabled in production builds

**Handlebars Template Injection (GHSA-2w6w-674q-4c4q)**
- Affects: Transitive via build tools
- Impact: Critical if user-supplied templates processed
- Lesson: Template engines are high-risk attack surface; monitor closely
- Solution: Verify handlebars upgraded to 4.7.9+

### Watch List (Recurring CVEs)

**handlebars** — 9 CVEs identified in 4.x series
- Pattern: AST type confusion, prototype pollution, code injection
- Status: No active maintenance; consider migration to safer engine (e.g., nunjucks, ejs with sandboxing)
- Action: Audit where handlebars is used; prefer compiled-time templates

**brace-expansion** — 4 DoS CVEs via expansion attacks
- Pattern: Exponential time complexity, unbounded arrays, OOM crashes
- Status: Fixed in 1.1.18+ but kept as transitive dep by many tools (glob, jest, etc.)
- Action: Run `npm audit fix` regularly; can't eliminate without removing build tools
- Mitigation: Don't pass untrusted glob patterns from user input

**js-yaml** — Quadratic complexity DoS
- Pattern: Merge-key chains force O(n²) YAML parsing
- Status: Fixed in 3.15.0+
- Action: Audit YAML config processing; validate YAML input size

**uuid** — Buffer overflow when buf parameter used (GHSA-w5hq-g745-h8pq)
- Pattern: Missing bounds check in v3/v5/v6 generation
- Status: Fixed in 11.1.1+
- Action: Upgrade uuid; safe for most uses that don't pass custom buffer

### Outdated Major Versions

| Package | Current | Latest | Gap | Priority |
|---------|---------|--------|-----|----------|
| express | 4.18.2 | 5.2.1 | 1 major | P3 (moderate CVE) |
| pino | 8.17.0 | 10.3.1 | 2 major | P3 (security + features) |
| react | 18.3.1 | 19.2.8 | 1 major | P3 (stable release) |
| react-router-dom | 6.26.0 | 7.18.2 | 1 major | P3 (stable release) |

### Audit Tools & Environment

**npm audit**
- Works well; JSON output structured and detailed
- Includes CVSS scores, CWE identifiers, affected versions, fix availability
- Exit code non-zero on any vulnerability (OK for CI gates)

**npm outdated**
- Shows current/wanted/latest versions
- Good for tracking major version gaps
- Run monthly to catch staleness

**npm ls**
- Counts transitive dependencies
- No built-in "total count" but can query via jq

**Tools NOT Available**
- `npm license-checker` — not pre-installed (checked licenses manually)
- `govulncheck` — Go dependencies not in scope (this project is npm-only)
- `pip-audit` — Python dependencies not in scope

**Project Scope**
- npm-only (no Go, Python, Rust, Java)
- 3 main source projects: Backend, Frontend, E2E
- ~1,450 transitive dependencies (Frontend is 1050+)

### Remediation Status

**Immediate (vitest critical)**
- Action: `npm install vitest@^4.1.10` in Source/Frontend
- Test: Verify test suite runs, no startup errors
- Estimated time: 15 min

**Short-term (express, uuid, react)**
- Action: `npm audit fix` in Source/Backend and Source/Frontend
- Test: Full test suite + build
- Estimated time: 1–2 hours (may break APIs, need test updates)

**Medium-term (pino, router major bumps)**
- Schedule: Next sprint
- Effort: 3–4 hours (breaking changes expected)
- Owner: Backend team (pino) + Frontend team (react-router)

### Cross-Team Escalation

**[ESCALATE → TheGuardians]**
- Vitest UI server RCE: If UI server ever exposed externally (e.g., CI logs, shared infra), direct RCE risk
- Handlebars injection: If templates are user-controlled or loaded from untrusted sources

**[Cross-ref: TheFixer]**
- Update express@5.x requires API review (breaking changes in routing)
- Update react@19.x may require hook refactoring
- Pino@10.x requires logging integration audit
