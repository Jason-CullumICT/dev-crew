# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-08-23 — First Full Audit
- **Projects audited:** 5 npm packages
- **Total CVEs found:** 99 (7 critical, 27 high)
- **Critical vulnerabilities:** handlebars (JS injection), protobufjs (RCE), vitest UI (file read/exec)
- **Highest-risk project:** portal/Backend (577 transitive dependencies, 55 CVEs)
- **Key finding:** Vitest UI server must NEVER run in production (critical exposure)

## Watch List — High-Recurrence Packages

These packages have recurring CVEs and require priority monitoring:

1. **vitest** — Frequent security issues (most recent: UI server exploit)
2. **vite** — Build tool vulnerabilities (path traversal, dev server issues)
3. **postcss** — CSS processing vulnerabilities (XSS via unescaped content)
4. **form-data** — HTTP field handling (CRLF injection)
5. **@grpc/grpc-js** — Protocol buffer vulnerabilities
6. **protobufjs** — RCE in protobuf parsing (keep updated)

## License Compliance Decisions

**Policy:** No GPL/AGPL in production dependencies.

All projects currently pass license check:
- Source/Backend, Frontend: MIT/Apache 2.0 compatible
- platform/orchestrator: MIT dominant
- portal/Backend, Frontend: MIT/Apache 2.0 compatible

## Audit Tools Confirmed Available

- ✅ npm audit (JSON output)
- ✅ npm outdated (JSON output, returns exit code 1 when outdated found)
- ⚠️ npm license-checker (NOT available — fallback to parsing package.json)
- ✅ npm list --depth=0 (for direct dependencies)

## Supply Chain Risk Insights

**Critical observation from 2026-08-23 audit:**
- portal/Backend has **577 transitive dependencies** — the largest footprint
- This creates significant attack surface for:
  - Typosquatting (similar package names)
  - Account compromise (maintainer credentials exposed)
  - Malware injection (if an upstream package is compromised)

**Recommendation:** Implement lock file integrity checks in CI/CD:
```bash
npm verify  # Verify integrity hashes in package-lock.json
```

## Pre-Audit Checklist for Next Run

1. Check if vitest critical fix has been applied (must update)
2. Verify protobufjs doesn't have new RCE advisories
3. Look for handlebars JavaScript injection patches
4. Monitor @opentelemetry versions for alignment
5. Check outdated major versions in Source/Backend
6. Verify no new brace-expansion DoS variants

## Notes for Future Auditors

- **npm outdated** returns exit code 1 on success (has outdated packages) — wrap with `|| true`
- **npm audit --json** is most reliable for parsing programmatically
- Lock files are the source of truth for transitive dependency versions
- Some packages have multiple CVEs; always check the `via` array for full list
- Consider implementing `npm audit --audit-level=high` in CI/CD to catch new issues early
