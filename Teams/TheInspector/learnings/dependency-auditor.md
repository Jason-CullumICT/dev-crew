# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run Summary (2026-07-24)

**Baseline established.** dev-crew monorepo scanned; 3 CRITICAL CVEs found.

## Watch List (Recurring CVE Patterns)

| Package | Known Issues | Last Seen | Action |
|---------|--------------|-----------|--------|
| **handlebars** | Template injection (GHSA-2w6w-674q-4c4q) | 4.7.8 | Transitive; remove if unused or bump handlebars version |
| **protobufjs** | Code generation RCE (GHSA-xq3m-2v4x-88gg) | ≤7.6.4 | Transitive via @opentelemetry; requires major version jump |
| **@opentelemetry/** | Unbounded memory (GHSA-8988-4f7v-96qf), Prometheus crash (GHSA-q7rr-3cgh-j5r3) | 0.40–0.76 | **CRITICAL: 175+ versions behind current** |
| **vitest** | RCE via UI server (GHSA-5xrq-8626-4rwp) | ≤3.2.5 | Dev-only but critical when server listening |
| **react-router-dom** | Open redirect to XSS (GHSA-jjmj-jmhj-qwj2) | ≤6.30.4 | Multiple CVEs; major upgrade needed |
| **vite** | Path traversal & fs.deny bypass (GHSA-fx2h-pf6j-xcff) | ≤6.4.2 | Dev server only; requires major version bump |

## License Compliance Decisions

✅ **Approved licenses:** MIT, Apache 2.0, BSD-2, BSD-3, ISC  
❌ **Prohibited:** GPL, AGPL (viral license risk in closed-source commercial product)  
⚠️ **Review required:** Custom licenses, UNLICENSED packages

**Status:** All direct & transitive dependencies in dev-crew use approved licenses.

## Audit Tools Available

- **npm audit** — Reports CVEs; JSON output via `npm audit --json`
- **npm outdated** — Shows upgradeable versions; JSON via `npm outdated --json`
- **npm list** — Dependency tree; useful for transitive analysis
- **No other SCA tools installed** — Recommend sophos-sca or snyk for enterprise use

## Prior CVE Findings & Fix Status

| CVE ID | Package | Status | Fix Applied |
|--------|---------|--------|-------------|
| GHSA-2w6w-674q-4c4q | handlebars | ❌ OPEN | Awaiting npm audit fix |
| GHSA-xq3m-2v4x-88gg | protobufjs | ❌ OPEN | Awaiting OpenTelemetry major version upgrade |
| GHSA-5xrq-8626-4rwp | vitest | ❌ OPEN | Awaiting vitest ≥3.2.6 upgrade |
| GHSA-jjmj-jmhj-qwj2 | react-router-dom | ❌ OPEN | Awaiting ≥7.18.0 upgrade |

## CI/CD Recommendations

1. **npm audit in pipeline:** Add `npm audit --audit-level=moderate` to pre-merge gate
2. **Quarterly SCA:** Run full dependency audit quarterly or on security advisory
3. **Transitive pinning:** Consider lock files for production builds (already have package-lock.json)
4. **Monitoring:** Subscribe to npm security advisories for watched packages

## Next Audit Schedule

**Recommended:** Quarterly (Q4 2026) or upon critical advisory release

**Trigger conditions for urgent re-audit:**
- npm sends security advisory email (watched packages)
- CVE CVSS >7.0 in direct dependency
- Dependency takeover or maintainer exit event
