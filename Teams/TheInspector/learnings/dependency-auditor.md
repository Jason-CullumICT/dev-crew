# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## First Audit Run: 2026-09-15

### Critical Findings (P1)
- **protobufjs (GHSA-xq3m-2v4x-88gg)**: RCE via deserialization in platform/orchestrator. CVSS 9.8. **IMMEDIATE FIX REQUIRED.**
- **vitest (GHSA-r9bx-mhh7-3q2q)**: File disclosure + RCE via test UI server in portal/Frontend. CVSS 9.1. Do NOT expose UI to untrusted networks.
- **handlebars (GHSA-3mfm-83xf-c92r)**: Template injection via AST tampering in Source/Backend. CVSS 8.6.
- **@grpc/grpc-js (GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq)**: Server crash via malformed requests. Affects both portal/Backend and platform/orchestrator.

### Recurring CVE Patterns
- **Form-data CRLF injection (GHSA-hmw2-7cc7-3qxx)**: Affects 4+ projects. Update to >=4.0.6.
- **Browserslist memory exhaustion (GHSA-c83g-rgw3-j3cx)**: Affects builds across all projects. Update to >=4.28.7.
- **Frontend dev dependencies cluster**: Vite, PostCSS, Nanoid, Vitest all have concurrent vulnerabilities in portal/Frontend and Source/Frontend.

### Audit Tools Available
- **npm audit --json**: Available in all npm projects ✅
- **npm outdated**: Available (no major version gaps detected in this run)
- **npm ls --json**: Available for license inspection
- **license-checker**: Not installed; used jq filtering instead

### License Compliance
- **Status**: ✅ PASS. No GPL/AGPL/SSPL licenses detected.
- **Policy**: All projects use permissive licenses (MIT, Apache-2.0, BSD).
- **Process**: Verified via npm ls and jq filtering.

### Dependency Metrics
| Project | Total Deps | Risk Level |
|---------|-----------|-----------|
| Source/E2E | 4 | 🟢 Clean |
| platform/orchestrator | 155 | 🔴 Critical vulnerabilities (RCE) |
| Source/Frontend | 230 | 🟡 High frontend deps |
| Source/Backend | 412 | 🟡 Template injection detected |
| portal/Frontend | 424 | 🔴 Vitest RCE + frontend cluster |
| portal/Backend | 577 | 🔴 Largest surface area (397 prod deps) |

### Supply Chain Assessment
- **Post-install scripts**: ✅ None detected
- **Abandoned packages**: ✅ None detected
- **Single-maintainer bus-factor**: ✅ Low risk (Babel, React, Vite are well-maintained)
- **Recent transfers**: ✅ None detected in critical packages

### Action Items
1. **Escalate to TheGuardians**: DEP-001, DEP-002, DEP-003 (RCE/disclosure findings)
2. **Fix priority order**:
   - Immediate: protobufjs, vitest, handlebars, @grpc/grpc-js
   - Week 1: form-data, browserslist, vite, postcss, nanoid
   - Week 2: Remaining 58 moderates and lows
3. **Verification**: Re-run npm audit after each batch; confirm zero new failures in test suite.

### Notes for Next Run
- portal/Backend has 577 total deps — largest attack surface. Prioritize its high-severity updates.
- vitest UI must be disabled in production configs.
- Consider adding `npm audit --audit-level=high` to CI gates to prevent new P1/P2 regressions.
- Form-data and browserslist are recurring across multiple projects — watch for future versions.
