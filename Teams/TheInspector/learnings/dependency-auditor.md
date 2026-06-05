# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-05

### Critical Findings (P1)

1. **Handlebars JavaScript Injection Chain** (GHSA-2w6w-674q-4c4q, CVSS 9.8)
   - Transitive dependency via jest → babel → handlebars
   - Multiple injection vectors (AST confusion, partial-block tampering, dynamic partials)
   - Affects Backend testing framework
   - Fix: `npm update` to pull handlebars ≥4.7.9

2. **Vitest Arbitrary File Read** (GHSA-5xrq-8626-4rwp, CVSS 9.8)
   - Affects Frontend testing framework (vitest@2.0.5)
   - UI server running on localhost exposes entire project to network access
   - Attack vector: any website can request files from Vitest UI
   - Fix: Upgrade vitest to ≥4.1.0 (requires testing for breaking changes)
   - Workaround: Ensure UI server not accessible externally, disable in production builds

### High-Risk Vulnerabilities (P2)

- **uuid buffer bounds (GHSA-w5hq-g745-h8pq)**: Backend direct dependency, CVSS 7.5
- **qs DoS (GHSA-q8mj-m7cp-5q26)**: Affects query string parsing in express, CVSS 5.3
- **React Router open redirect (GHSA-2j2x-hqr9-3h42)**: Frontend transitive
- **Vite path traversal (GHSA-4w7w-66w2-5vf9)**: Frontend dev server, CWE-22
- **PostCSS XSS (GHSA-qx2v-qp2m-jg93)**: CSS injection risk, CVSS 6.1
- **esbuild CORS bypass (GHSA-67mh-4wv8-2f99)**: Dev server source code exposure, CVSS 5.3
- **ws memory disclosure (GHSA-58qx-3vcg-4xpx)**: WebSocket uninitialized memory, CVSS 4.4

### Deprecated & Abandoned Packages

**Backend:**
- `glob` — Old versions have publicized security issues, unmaintained
- `inflight` — Memory leak, not supported, replace with lru-cache
- `supertest` — Upgrade to ≥7.1.3 (Forward Email maintains now)
- `superagent` — Upgrade to ≥10.2.2 (Forward Email maintains now)

**Frontend:**
- None detected (clean)

### Outdated Major Versions

**Backend:**
- express: 4.18.2 → 5.2.1 (1 major version, plan migration)
- pino: 8.17.0 → 10.3.1 (2 major versions, significant API changes expected)
- uuid: 9.0.0 → 14.0.0 (5 major versions, combine with CVE fix)

**Frontend:**
- react: 18.3.1 → 19.2.7 (1 major, React 19 has breaking API changes)
- react-dom: 18.3.1 → 19.2.7 (1 major)
- react-router-dom: 6.26.0 → 7.17.0 (1 major)

### Dependency Tree Metrics

| Project | Direct | Transitive | Ratio | Health |
|---------|--------|-----------|-------|--------|
| Backend | 4 | 102 | 25.5x | 🟡 MODERATE (4 deprecated, 1 critical CVE) |
| Frontend | 8 | 222 | 27.75x | 🔴 HIGH (1 critical CVE, wide dev toolchain exposure) |
| E2E | 1 | 4 | 4x | 🟢 CLEAN (no CVEs) |

### Audit Tools & Methods Used

1. **npm audit --json** (direct audit reports)
2. **npm outdated --json** (version comparison)
3. **package-lock.json analysis** via jq (license extraction, deprecated flags)
4. **Manual CVE cross-reference** against known GitHub advisories

### Recommendations for Next Audit

1. **Critical Actions (This Week):**
   - [ ] Upgrade vitest to ≥4.1.0 in Frontend (test thoroughly)
   - [ ] Upgrade express to ≥4.22.2 in Backend (qs fix)
   - [ ] Upgrade uuid to ≥14.0.0 in Backend (buffer bounds fix)
   - [ ] Remove deprecated packages from Backend test suite

2. **Medium Priority (This Sprint):**
   - [ ] Upgrade vite in Frontend (≥5.4.1 for path traversal fix)
   - [ ] Upgrade pino in Backend (v10.x migration)
   - [ ] Upgrade react-router-dom in Frontend (open redirect fix)

3. **Planning Phase:**
   - [ ] React 19 migration (major, 1 quarter)
   - [ ] Express v5 migration (major, 1 quarter)
   - [ ] pino v10 migration with breaking change review

### Known Patterns

**Transitive Chains to Watch:**
- jest → babel → handlebars (test infrastructure risk)
- vite → esbuild → security issues in dev builds
- express → qs → DoS risk

**License Compliance Status:** ✅ All MIT/Apache/ISC (no viral licenses detected)

**Supply Chain Risk:** 🔴 HIGH due to:
- 648 transitive dependencies across 3 projects
- Critical vulnerabilities in dev toolchain (vitest, esbuild)
- Deprecated packages still in use
- Large gap between current and latest versions
