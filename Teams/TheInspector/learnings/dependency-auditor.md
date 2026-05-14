# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-05-14: First Audit Run

**Critical Finding - Handlebars JavaScript Injection (CVSS 9.8)**
- Identified in Backend transitive dependencies (411-node tree)
- Located at version 4.7.8, vulnerable range >=4.0.0 <=4.7.8
- Requires identifying direct requirer; likely a dev tool or testing library
- Multiple RCE vectors via AST type confusion and template injection
- Action: Upgrade direct requirer to use handlebars 4.7.9+

**Frontend Vite Path Traversal (Dev-time Vulnerability)**
- Vite 5.4.0 (direct dep) has .map file leak in optimized deps
- Low CVSS but applies to dev server; affects Source Maps
- Fix: `npm update vite` to 6.4.2+

**Moderate CVEs in Build Tools**
- PostCSS XSS via unescaped </style> (GHSA-qx2v-qp2m-jg93)
- esbuild CORS bypass in dev server (GHSA-67mh-4wv8-2f99)
- brace-expansion DoS (GHSA-f886-m6hf-6m8v)
- All resolvable via npm audit --fix or targeted upgrades

**Outdated Packages**
- Backend: Express 4.18.2 (→5.2.1, 1 major gap) - EOL as of 2026, requires testing
- Backend: Pino 8.17.0 (→10.3.1, 2 major gap) - logging framework, safe upgrade
- Frontend: React 18.3.1 (→19.2.6, 1 major gap) - plan as sprint work
- Frontend: React Router 6.30.3 (→7.15.0, 1 major gap) - breaking changes expected

**Supply Chain Observations**
- Total of 645 transitive dependencies across Backend + Frontend
- No GPL/AGPL licenses detected; all major deps use MIT/Apache-2.0/BSD
- No abandoned packages in direct dependencies
- uuid has single maintainer (Robert Kieffer) - monitor for burnout
- No suspicious post-install scripts detected in major dependencies

**Audit Tools Available**
- npm audit works for all npm projects
- npm outdated provides version gaps
- License info available via package.json in lock files
- No npm-audit-level override flag needed; standard severity classification applies

**Grading Notes**
- 1 Critical CVE (handlebars) → P1
- 6+ Moderate CVEs in transitive/dev deps → P2/P3
- 4+ major version gaps (Backend express, pino, uuid) → P3
- **Result: Grade D** (1 P1 CVE exceeds Grade A/B thresholds per inspector.config.yml)

**Next Audit Trigger**
- After handlebars resolution
- After npm audit --fix applied
- After major version upgrades completed
- Recommended: Weekly automated runs via CI/CD
