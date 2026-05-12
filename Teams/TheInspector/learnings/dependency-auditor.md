# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run 2026-05-12

### Critical Findings

1. **Handlebars RCE** — JavaScript injection via AST type confusion. Used in Source/Backend. Multiple CVEs (GHSA-2w6w-674q-4c4q critical, CVSS 9.8). Requires immediate upgrade to 4.7.9+.
   - **Watch list:** Handlebars is high-risk if user-controlled template input. Consider alternate templating if not needed.

2. **Protobufjs RCE** — Arbitrary code execution via untrusted .proto files. Found in platform/orchestrator and portal/Backend. GHSA-xq3m-2v4x-88gg (CVSS 9.8). Upgrade to 7.5.5+.
   - **Watch list:** Verify proto loading is not dynamic. Do not accept user-supplied .proto files.

### High-Severity Pattern: ReDoS in Routing

- **path-to-regexp** (platform/orchestrator, portal/Backend) — GHSA-37ch-88jc-xwx2, ReDoS with multiple route parameters
- **picomatch** (portal/Frontend) — GHSA-c2c7-rcm5-vvqj, ReDoS in glob patterns

Both affect application availability. Requires fuzzing tests in chaos-monkey.

### OpenTelemetry Metrics Endpoint

- **@opentelemetry/auto-instrumentations-node + sdk-node** (portal/Backend) — Prometheus exporter crashes on malformed HTTP. GHSA-q7rr-3cgh-j5r3 (CVSS 7.5).
- **Fix:** Upgrade to 0.75.0+ and 0.217.0+.
- **Note:** Metrics endpoints should not be exposed to untrusted networks. Verify access control.

### Development-Only Vulnerabilities

The following are **not production risks** but impact developer workflows:

- **Vite path traversal** — GHSA-4w7w-66w2-5vf9, dev-only, requires 8.0.12+
- **esbuild CORS bypass** — GHSA-67mh-4wv8-2f99, dev server only, requires esbuild update via vite
- **PostCSS XSS** — GHSA-qx2v-qp2m-jg93, build-time CSS processing, requires 8.5.10+

### Outdated Packages (No Security Blocker)

- **express** — 1 major version behind (4.22.2 vs 5.2.1). Stable, but plan migration for long-term maintenance.
- **pino** — 2 major versions behind (8.21.0 vs 10.3.1). Upgrade recommended for observability improvements.
- **uuid** — 5 major versions behind (9.0.1 vs 14.0.0). Low priority — backward compatible.

### Supply Chain Risk

- **portal/Backend** has 577 total dependencies (397 prod + 181 dev) — large surface area.
- **No post-install scripts detected** across primary workspaces — good security posture.
- **No GPL/AGPL violations** — license compliance clean.

### Audit Tools

- **npm audit --json** — works reliably on all npm workspaces
- **npm outdated --json** — detects major version gaps
- **npm list --depth=0 --json** — direct dependency counts (but counts include devDeps)

### License Compliance

- No current violations, but recommend full audit with `license-checker` if exporting under proprietary terms

### Recommendations for Next Audit

1. **Immediate actions** (within 48 hours): Update handlebars, protobufjs
2. **Weekly actions**: Update path-to-regexp, opentelemetry deps, vite/vitest
3. **Monitor these packages** for future releases:
   - handlebars (template injection risk)
   - protobufjs (RCE risk if user-controlled input)
   - vite/vitest (frequent major version updates)
4. **Consider architectural changes**:
   - Evaluate if handlebars is necessary (consider Eta/Nunjucks alternatives)
   - Verify protobuf loading is not dynamic
   - Protect `/metrics` endpoint from untrusted networks

### Escalations Made

- **[ESCALATE → TheGuardians]:** Template injection (handlebars), RCE (protobufjs), metrics endpoint access control
- **[CROSS-REF → chaos-monkey]:** ReDoS testing on routes and globs, metrics endpoint malformed request testing
- **[CROSS-REF → red-teamer]:** Template injection testing, protobuf validation, route fuzzing

---

## Learnings Summary

This is a **high-risk audit** with 30 total CVEs, 2 critical, 5 high. However, immediate patching of handlebars and protobufjs will resolve the critical exposures. Most other vulnerabilities are either transitive/dev-only or address availability rather than integrity. Priority: handlebars + protobufjs upgrades within 48 hours.
