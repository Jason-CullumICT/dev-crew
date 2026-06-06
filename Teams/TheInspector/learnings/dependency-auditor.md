# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-06

### Environment Setup
- **Node/npm:** Available in build environment via `npm audit`, `npm outdated`
- **Lock Files:** Canonical source of truth; package.json stores direct deps only
- **package-lock.json Structure:** Use `.packages | to_entries[]` for full transitive tree
- **License Data:** Available via `.packages[].license` field; no separate tool needed

### Audit Findings Summary
**Grade: C** (1 CRITICAL, 5 MODERATE, 4 DEPRECATED, 8 MAJOR VERSION GAPS)

#### Critical Findings
- **handlebars (P1):** Critical JavaScript injection (GHSA-2w6w-674q-4c4q, CVSS 9.8)
  - Phantom dependency: Appears in audit but not installed
  - Verify with `npm ls handlebars` after `npm install`
  - Fix: Update to 4.7.8+ OR clear audit cache

#### High-Impact (P2)
- **uuid (P2):** Buffer overflow in v3/v5/v6 (GHSA-w5hq-g745-h8pq)
  - Direct in Backend; 5 major versions behind (9.0.1 → 14.0.0)
  - Requires breaking-change update
- **pino (P2):** 2 major versions behind (8.21.0 → 10.3.1)
  - Critical for audit logging; missing security patches
- **glob (P2):** Deprecated; known security vulns; inherited by Jest/TypeScript toolchain
- **supertest (P2):** Dev dependency marked deprecated; upgrade to 7.1.3+

#### Medium-Impact CVEs (P3)
- **qs DoS:** Null-entry crash in query string parsing (GHSA-q8mj-m7cp-5q26)
  - Transitive via express → body-parser → qs
  - Fix: `npm audit fix`
- **PostCSS XSS:** Unescaped </style> tag (GHSA-qx2v-qp2m-jg93)
  - Frontend build tool; dev-time risk
- **React Router:** Open redirect via protocol-relative URL (GHSA-2j2x-hqr9-3h42)
  - Path starting with // interpreted as protocol-relative
- **esbuild CORS:** Dev server CORS bypass (GHSA-67mh-4wv8-2f99)
  - Dev-time only; requires --force to fix (breaking Vite change)
- **brace-expansion/inflight:** ReDoS/memory leaks in glob ecosystem
- **ws:** Uninitialized memory in WebSocket frames (dev-time test only)

#### Dependency Versions Behind
- `uuid`: 5 major versions (9 → 14)
- `pino`: 2 major versions (8 → 10)
- `express`: 1 major version (4 → 5)
- `react/react-dom`: 1 major version (18 → 19)
- `react-router-dom`: 1 major version (6 → 7)
- `vite`: 3 major versions (5 → 8) [if --force npm audit fix]

### License Compliance
✅ **PASSING** — No GPL/AGPL/SSPL licenses detected
- MIT: 348 packages (dominant)
- ISC: 34
- BSD-3-Clause: 15
- Apache-2.0: 8
- 2 unlicensed: exit@3.0.2 (MIT intent, unmarked), 1x CC-BY-4.0 (attribution-only)

### Dependency Tree Stats
| Project | Direct | Transitive | Risk |
|---------|--------|-----------|------|
| Backend | 14 | 411 | MODERATE (uuid + pino + glob deprecated) |
| Frontend | 13 | 230 | MODERATE-LOW (React/Vite stable) |
| E2E | 1 | 5 | LOW (Playwright, no CVEs) |

### Key Learnings for Next Audits
1. **Handlebars phantom issue:** Always verify critical CVEs exist in lock file before flagging
   - Run `npm ls <pkg>` to confirm installation
2. **uuid adoption:** Breaking change from v9→v14; requires:
   - Check if caller uses `buf` parameter (affected function signature)
   - Test UUID generation paths
   - Verify no custom buffer passing
3. **Deprecated package tracking:**
   - glob, inflight, superagent, supertest all have long deprecation notices
   - These are inherited from test/build toolchain, not application code
   - Coordinate with frontend/backend upgrade sprints
4. **npm audit fix limitations:**
   - `npm audit fix` handles most moderate CVEs
   - `npm audit fix --force` needed for major version bumps (esbuild/vite)
   - Always test after --force (breaking changes)
5. **License checking workflow:**
   - No license-checker tool available; parse package-lock directly
   - jq queries: `.packages | to_entries[] | select(.value.license) | .value.license`
   - Unlicensed packages warrant separate review (legal/policy decision)
