# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-05-16

### Critical Vulnerabilities Watch List
1. **handlebars** — 8 overlapping CVEs (4.0.0 - 4.7.8). Type confusion in AST causes arbitrary code execution. Update to >=4.7.9 or remove if unused.
2. **protobufjs** — 8 CVEs including arbitrary code execution (<=7.5.5). Systematic design flaws in proto code generation. Used by @opentelemetry packages; hard dependency chain.

### Build Toolchain Fragility
- **vite/vitest/esbuild:** Single vulnerability cascades to 5+ dependent packages
- **Recommendation:** Keep these in sync; version upgrade one forces others
- **Portal/Frontend has 416 dev dependencies** — excessive for a React SPA; audit and prune unused packages

### Outdated Dependencies (Security Patches Gap)
- express 4.18.2 (gap: 1 major), pino 8.17.0 (gap: 2 major), uuid 9.0.0 (gap: 5 major)
- React 18.3.1 vs 19.2.6 (1 major gap)
- Schedule quarterly review; don't rush major version upgrades without testing

### npm Audit Tools & Environment
- **Tool:** npm audit (built-in, v10.8.2)
- **Node version:** v20.20.2
- **Lock file status:** All 10 manifests have package-lock.json; no yarn.lock detected
- **npm ci:** Use in CI/CD to ensure lock file integrity

### License Compliance Status
- **Result:** No GPL/AGPL detected; all major deps use MIT or Apache 2.0
- **Risk:** Low — no viral license issues
- **Action:** Re-check annually; some deps have dual licenses

### Supply Chain Risk Surface
- **Total transitive deps:** ~2,000+ (from 6 lock file sizes)
- **Highest risk area:** platform/orchestrator (153 prod deps, including protobufjs chain)
- **Test-only risk:** portal/Frontend vitest chain has known ReDoS vulnerabilities; low production impact

### Audit Tools Available in This Environment
- ✅ npm audit (CLI, JSON output)
- ✅ npm outdated (shows version gaps)
- ❌ npm license-checker (not installed; can run via `npx license-checker`)
- ❌ pip-audit (Python, not needed for this project)
- ❌ govulncheck (Go, not needed for this project)

### Remediation Strategy
1. **Phase 1 (immediate):** Fix P1 handlebars + protobufjs + @opentelemetry
2. **Phase 2 (this month):** Build toolchain upgrades (vite/vitest)
3. **Phase 3 (quarterly):** Major version bumps + dependency tree pruning

### Prior Findings
- None yet; this is the first audit.
