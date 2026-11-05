# TheInspector Health Audit — 2026-11-05

**Grade: D** | Run: `run-20261105-091827` | Branch: `audit/inspector-2026-11-05-5af6bb`

---

## Grade Rationale

| Threshold | Required | Actual | Result |
|-----------|----------|--------|--------|
| A | max_p1=0, max_p2=3 | 6 P1, 15 P2 | ✗ FAIL |
| B | max_p1=0, max_p2=8 | 6 P1, 15 P2 | ✗ FAIL |
| C | max_p1=2, max_p2=15 | 6 P1, 15 P2 | ✗ FAIL |
| **D** | max_p1=999 | 6 P1 | ✓ PASS |
| F | exploitable auth bypass + critical domain failure | DEP-001 (auth bypass) present; core domain functions intact | Edge — graded D |

Spec coverage (actively enforced): **93.1%** (27/29) — healthy. The grade is driven entirely by dependency vulnerabilities.

---

## ⚠️ ESCALATION → TheGuardians

**5 critical CVEs require security review before next release:**

| ID | Title | Impact | Projects |
|----|-------|--------|----------|
| DEP-001 | proxy-addr IP spoofing (GHSA-f596-whhp-79r4) | Auth bypass via IPv4-mapped IPv6 | Source/Backend, platform/orchestrator |
| DEP-002 | Handlebars.js template injection RCE | Server-side code execution | Source/Backend |
| DEP-003 | tinypool prototype pollution RCE | CI/CD pipeline compromise | Source/Frontend, portal/Frontend |
| DEP-004 | Vitest UI arbitrary file read + execution | Filesystem disclosure | portal/Frontend |
| DEP-005 | protobufjs code injection | Code injection in orchestrator | platform/orchestrator |

**Trigger:** Read `Teams/TheGuardians/team-leader.md` and follow in an ephemeral isolated environment.

---

## Findings Summary

### P1 Findings (6 total — block release)

| ID | Source | Title | Route |
|----|--------|-------|-------|
| DEP-001 | dependency-auditor | proxy-addr IP spoofing — auth bypass | **TheGuardians** |
| DEP-002 | dependency-auditor | Handlebars.js RCE via @partial-block | **TheGuardians** |
| DEP-003 | dependency-auditor | tinypool prototype pollution RCE | **TheGuardians** |
| DEP-004 | dependency-auditor | Vitest UI arbitrary file read | **TheGuardians** |
| DEP-005 | dependency-auditor | protobufjs code injection | **TheGuardians** |
| QO-001 | quality-oracle | `GET /api/search` not registered — DependencyPicker broken | TheFixer |

### P2 Findings (15 total — this sprint)

| ID | Source | Title |
|----|--------|-------|
| QO-002 | quality-oracle | `dependencyCheckDuration` Prometheus histogram missing |
| QO-003 | quality-oracle | Route handlers bypass service layer (3 route files) |
| DEP-006 | dependency-auditor | @grpc/grpc-js DoS + cert bypass |
| DEP-007 | dependency-auditor | body-parser DoS via invalid Content-Length |
| DEP-008 | dependency-auditor | brace-expansion zero-step DoS |
| DEP-009 | dependency-auditor | Browserslist memory exhaustion |
| DEP-010 | dependency-auditor | form-data CRLF injection |
| DEP-011 | dependency-auditor | js-yaml quadratic complexity DoS |
| DEP-012 | dependency-auditor | nanoid non-secure generator |
| DEP-013 | dependency-auditor | PostCSS XSS via unescaped `</style>` |
| DEP-014 | dependency-auditor | source-map-js event loop DoS |
| DEP-015 | dependency-auditor | path-to-regexp ReDoS |
| DEP-016 | dependency-auditor | ws uninitialized memory disclosure |
| DEP-017 | dependency-auditor | Vite path traversal in source map handling |
| DEP-018 | dependency-auditor | picomatch glob pattern injection |

### P3 Findings (5 total — backlog)

| ID | Title |
|----|-------|
| QO-004 | Traceability enforcer misses FR-dependency-* requirements |
| QO-005 | 2 specs with 0% Source/ coverage (likely deferred) |
| QO-006 | eslint-disable without rationale in 2 production files |
| DEP-SC-001 | @opentelemetry meta-package inflates supply chain surface |
| DEP-SC-002 | 26 outdated packages; Vite/Vitest recurring vulnerability pattern |

---

## Cross-Reference Map

| Group | Root Cause | Affected Findings | Single Fix |
|-------|-----------|-------------------|------------|
| XREF-001 | Outdated Vite/Vitest toolchain | DEP-003, DEP-004, DEP-013, DEP-014, DEP-017, DEP-018 | `npm update vite vitest tinypool postcss source-map-js picomatch` in Source/Frontend + portal/Frontend |
| XREF-002 | Stale express/connect middleware | DEP-001, DEP-007, DEP-010 | `npm update express body-parser form-data proxy-addr` in Source/Backend + platform/orchestrator |
| XREF-003 | FR-dependency-* partially implemented | QO-001, QO-002, QO-004 | Register `/api/search`, add `dependencyCheckDuration` histogram, expand traceability enforcer |

---

## Specialist Coverage

| Specialist | Mode | Findings |
|-----------|------|---------|
| quality-oracle | static | 1 P1, 2 P2, 3 P3 |
| dependency-auditor | static | 5 P1, 13 P2, 2 P3 |
| performance-profiler | **skipped** (services offline) | — |
| chaos-monkey | **skipped** (services offline) | — |

**Note:** Grade may improve with dynamic specialists if no additional findings surface. Run with live services on next audit (2026-11-19).

---

## Spec Coverage

| Spec Set | Total | Traced | % |
|----------|-------|--------|---|
| FR-WF-* (workflow-engine) | 13 | 13 | **100%** |
| FR-dependency-* | 16 | 14 | **87.5%** |
| FR-001–FR-069 (dev-workflow-platform) | 69 | 0 | 0% (out-of-scope / deferred) |
| FR-TMP-* (tiered-merge-pipeline) | 10 | 0 | 0% (out-of-scope / platform/) |

**Actively enforced coverage: 93.1%** (27/29)

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-11-05-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-11-05.json` | Machine-readable bug backlog |
| `inspector-report.md` | This summary |

**Next audit:** 2026-11-19 (bi-weekly)

---

## Immediate Actions (next 24 hours)

```bash
# 1. Trigger TheGuardians for 5 critical CVEs

# 2. Patch critical dependencies
cd Source/Backend && npm update proxy-addr handlebars
cd Source/Frontend && npm update tinypool vitest
cd platform/orchestrator && npm update proxy-addr protobufjs
cd portal/Frontend && npm update tinypool vitest

# 3. Fix broken search route (QO-001)
# → Register GET /api/search in Source/Backend/src/app.ts
# → Test contract: Source/Backend/tests/routes/search.test.ts

# 4. Emergency portal/Backend audit
cd portal/Backend && npm audit fix || npm audit fix --force
```
