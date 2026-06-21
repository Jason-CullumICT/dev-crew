# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-21

### Critical Findings
- **Vitest UI RCE (GHSA-5xrq-8626-4rwp)**: Frontend workspace vitest@2.0.5 has critical vulnerability in development UI server. While dev-only, it's a supply-chain risk if dev server is exposed. Requires upgrade to v3.2.6+.
- **Protobufjs RCE (GHSA-xq3m-2v4x-88gg)**: Portal/Backend has critical arbitrary code execution via protobufjs@7.5.5 (transitive via @grpc/grpc-js). Multiple injection vectors. CVSS 9.8.
- **OpenTelemetry DoS (GHSA-q7rr-3cgh-j5r3)**: Portal/Backend exporter crashes on malformed HTTP request. Complete service unavailability. Requires @opentelemetry/auto-instrumentations-node ≥0.77.0, cascades to sdk-node v0.219.0+.

### Workspace Risk Assessment
- **Portal/Backend**: CRITICAL — largest transitive tree (578 deps), 3 critical CVEs, highest exposure
- **Source/Frontend**: HIGH — vitest RCE, form-data CRLF, vite bypass, ws DoS, react-router redirect (5 high/critical)
- **platform/orchestrator**: HIGH — 9 vulnerabilities including protobufjs, grpc, @grpc/grpc-js
- **Source/Backend**: MODERATE — 27 vulnerabilities but mostly dev-time (ts-jest, jest components)
- **Source/E2E**: MINIMAL — only 1 direct dep, 5 transitive, no CVEs

### Outdated Packages Watch List
- **Express**: 1 major version behind; v4 has qs DoS vulnerability (moderate). Plan v5 migration (breaking changes in middleware).
- **Pino (Backend)**: 2 major versions behind (8.17 vs 10.3). Portal Backend is current. Recommend Backend upgrade + test logging behavior.
- **React & React-DOM**: 1 major version behind (18.3 vs 19.2). Generally backward compatible; React 19 improves hooks API.
- **React-Router-DOM**: 1 major version behind (6.30.4 vs 7.18). v6.30.4 already has CVE fix (GHSA-2j2x-hqr9-3h42); v7 is stable.
- **UUID**: Significant lag (9.0 vs 14.0). v9 has buffer bounds vulnerability (GHSA-w5hq-g745-h8pq). Upgrade critical.
- **OpenTelemetry**: 8+ minor versions behind; this is pre-v1.0 semver. v0.219 has fixes. Future v1.0 migration expected.
- **Vitest**: Minor version lag but contains CRITICAL CVE in v2.0.5 and earlier v3 betas. Jump to v3.2.6+ required.
- **Vite**: 5.4.0 has path traversal on Windows; also esbuild+postcss issues. Update to v5.4.3+ or v6.4.3+.

### License Compliance Status
- **Result**: No GPL/AGPL detected. No UNLICENSED packages. All primary deps are MIT.
- **Status**: COMPLIANT — no viral license risks, no proprietary conflicts

### Security Posture Observations
- **Post-install scripts**: NONE detected. Good security practice.
- **Deprecated packages**: None found (all actively maintained).
- **Supply chain risk**: HIGH due to Portal/Backend's 578 transitive deps and protobufjs/grpc vulnerabilities.

## Recommendations for Future Audits

### Short-term (Next 2 weeks)
1. **Immediate remediation plan** for 4 critical CVEs (vitest, protobufjs, opentelemetry x2)
2. **Automated npm audit** on every PR to catch regressions
3. **Breaking change testing** for express v5, vitest v3, react v19, uuid v14 migrations

### Medium-term (Next release)
1. **Evaluate OpenTelemetry v1.0** roadmap; plan migration from v0.x
2. **Multer v2 migration** for Portal (file upload handling changes)
3. **Express v5 feasibility** study (middleware order, callback changes)
4. **Lock file alignment** — Portal/Backend at v10 pino, Backend at v8. Standardize within team.

### Long-term
1. **Dependency freshness target**: No package >1 major version behind current
2. **Automated scanning**: Integrate Snyk or npm audit into CI/CD with failing gates
3. **Supply chain audit**: Monitor protobufjs and @grpc/grpc-js for future CVEs (recurrence risk)

### Tools Verified
- **npm audit**: Fully operational. Produces accurate JSON output with CVSS scores, CWE references, and fix guidance.
- **npm outdated**: Works; provides wanted/latest versions.
- **Environment**: npm installed globally; workspaces detected correctly.

## Learnings from Portal Backend Analysis
The Portal Backend is a high-risk workspace:
- Largest dependency tree (578 transitive) vs. Source/Backend (412), Source/Frontend (231)
- Imports OpenTelemetry stack for tracing (instrumentation-node pulls 50+ transitive deps)
- gRPC integration brings in protobufjs (historically CVE-prone)
- Better-sqlite3 native binding (not a CVE risk but worth monitoring in future audits for compilation issues)
- **Recommendation**: Prioritize Portal/Backend security reviews and supply chain hardening

## Status: Ready for Next Audit
- Baseline established (40 CVEs across 6 workspaces, 4 critical)
- Tracking fields established (severity, category, package, file, CVE ID, CVSS)
- Cross-reference protocol working (escalation to TheGuardians, notes for code-reviewer)
- Grade formula validated: Multiple P1 unresolved = D grade
