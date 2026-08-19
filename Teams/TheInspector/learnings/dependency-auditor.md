# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit 2026-08-19 – Critical CVE Findings

#### Watch List: High-Risk Packages
1. **protobufjs** — Multiple CVEs in ≤7.6.4, including arbitrary code execution. Used transitively via @grpc/grpc-js in orchestrator.
2. **handlebars** — JavaScript injection via AST confusion (≤4.7.8). Used in build toolchain (ts-jest / jest).
3. **vitest** — Arbitrary file read from UI server (<3.2.6). Used directly in Frontend dev dependencies.

#### Critical Issues This Run
- **3 Critical CVEs** blocking deployments:
  - handlebars RCE in Source/Backend (via jest)
  - vitest RCE/disclosure in Source/Frontend (dev server)
  - protobufjs RCE in platform/orchestrator (gRPC)
- **10 High-severity CVEs** requiring immediate attention
  - Open redirects, DoS vectors, header injections, path traversals
- **16 Moderate CVEs** from transitive dependencies

#### Recommended Remediation Sequence
1. **Source/Frontend:** Upgrade vitest@4.1.11+ (breaking change), react-router-dom@latest
2. **Source/Backend:** Upgrade handlebars@latest, brace-expansion@latest
3. **platform/orchestrator:** Upgrade @grpc/grpc-js@latest (pulls protobufjs fix), then plan major version upgrades (dockerode, express, multer)

#### Dependency Size Observations
- Backend: 231 packages, 5 direct (92% transitive)
- Frontend: 231 packages, 3 direct (99% transitive)
- Orchestrator: 156 packages, 3 direct (98% transitive)
- Total: 622 packages across 4 manifests
- **Recommendation:** Consider dev dependency minimization; high surface area for vulnerabilities.

#### Package Managers Detected
- **npm/Node.js** exclusively; no Go, Python, or Rust in core services.
- **npm audit tool:** Working correctly; use `npm audit --json` for parsing.

#### Tools & Techniques Used
- `npm audit --json` — Primary CVE scanning (npm Security Advisory v2)
- `npm outdated --json` — Version tracking
- `package-lock.json` — Transitive dependency counting
- Manual CVSS and CWE review for prioritization

#### Escalation Points
- **TheGuardians:** All P1 findings (3 critical RCEs)
- **Performance-Profiler:** Large dependency tree baseline; monitor post-upgrade

#### License Compliance
- No GPL/AGPL/viral licenses detected
- ISC and other permissive licenses in use
- No significant license risk identified
