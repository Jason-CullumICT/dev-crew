# TheInspector — Audit Report
**Grade: C** · Date: 2026-09-27 · Branch: `audit/inspector-2026-09-27-abead6` · Audit ID: `run-20260927-080255`

---

## Grade Summary

| Grade | Criterion | Result |
|-------|-----------|--------|
| **C** | P1 findings ≤ 2 | ✅ 2 P1s |
|       | P2 findings ≤ 15 | ✅ 13 P2s |
|       | Spec coverage ≥ 40% | ✅ 93–100% (Source/ scope) |

> **C grade** — significant dependency CVE debt (25 CVEs) and two critical gaps (unimplemented spec-required route + Handlebars injection risk) prevent a higher grade. Core architecture discipline is strong. Remediating the npm audit backlog in a single operation would lift this to B.

---

## Specialists

| Specialist | Mode | Findings | Standalone Grade |
|------------|------|----------|-----------------|
| quality-oracle | static | 1 P1 · 3 P2 · 2 P3 | B |
| dependency-auditor | static | 1 P1 · 10 P2 · 7 P3 · 2 P4 | D |
| performance-profiler | static (services offline) | 0 (latency data unavailable) | N/A |
| chaos-monkey | static (services offline) | 0 (fault injection not run) | N/A |

---

## P1 Findings (2)

### QO-001 — GET /api/search route not wired — intentionally failing tests contaminate baseline
- **Severity:** P1 · spec-drift
- **File:** `Source/Backend/src/app.ts` (route unregistered) · `Source/Backend/tests/routes/search.test.ts:1`
- **Impact:** Test baseline corrupted; FR-dependency-search unimplemented; CI reports permanent failures masking real regressions.
- **Fix:** Implement `GET /api/search` route OR formally defer FR-dependency-search and mark tests as `test.skip`.
- **Route to:** TheFixer (backend-coder) · requirements-reviewer (defer decision)

### DEP-001 — Handlebars JavaScript Injection (GHSA-3mfm-83xf-c92r) ⚠ [ESCALATE → TheGuardians]
- **Severity:** P1 · CVE/CWE-94 · Critical
- **File:** `Source/Backend/package-lock.json`
- **Package:** `handlebars <=4.7.8` (transitive)
- **Impact:** Arbitrary JavaScript execution server-side if backend renders Handlebars templates with user-controlled partials.
- **Fix:** `npm audit fix` in `Source/Backend`. Verify no user-controlled Handlebars template usage.
- **Route to:** TheGuardians (security review) + TheFixer (npm fix)

---

## Escalations → TheGuardians (4)

| ID | Finding | Trigger | Urgency |
|----|---------|---------|---------|
| DEP-001 | Handlebars JavaScript code injection (GHSA-3mfm-83xf-c92r) | injection | Before next deploy |
| DEP-004 | form-data CRLF injection in multipart fields (GHSA-hmw2-7cc7-3qxx) | injection | This sprint |
| DEP-007 | PostCSS source map disclosure + XSS (4 CVEs) | sensitive data exposed | This sprint |
| DEP-010 | React Router open redirect via protocol-relative URL (GHSA-2j2x-hqr9-3h42) | missing access control | This sprint |

---

## P2 Findings (13)

| ID | Specialist | Title | Route |
|----|-----------|-------|-------|
| QO-002 | quality-oracle | `dependencyCheckDuration` histogram missing from Source/Backend metrics | TheFixer |
| QO-003 | quality-oracle | Traceability enforcer excludes portal/ + platform/ — 89 requirements unaudited | TheFixer |
| QO-004 | quality-oracle | OpenTelemetry not instrumented in Source/Backend (CLAUDE.md rule violated) | TheFixer |
| DEP-002 | dependency-auditor | brace-expansion DoS via zero-step sequence (GHSA-fwmj-hxvj-5930) | TheFixer |
| DEP-003 | dependency-auditor | browserslist memory exhaustion — Backend + Frontend (2 CVEs) | TheFixer |
| DEP-004 | dependency-auditor | form-data CRLF injection (GHSA-hmw2-7cc7-3qxx) **[ESCALATE]** | TheGuardians |
| DEP-005 | dependency-auditor | js-yaml quadratic DoS in merge key handling (GHSA-6bw5-2rq6-7hcj) | TheFixer |
| DEP-006 | dependency-auditor | nanoid RNG initialization bugs + integer overflow (3 CVEs) | TheFixer |
| DEP-007 | dependency-auditor | PostCSS XSS + source map path traversal (4 CVEs) **[ESCALATE]** | TheGuardians |
| DEP-008 | dependency-auditor | Vite path traversal in optimized deps .map handling | TheFixer |
| DEP-009 | dependency-auditor | WebSocket (ws) memory disclosure + DoS via fragments (2 CVEs) | TheFixer |
| DEP-010 | dependency-auditor | React Router open redirect via protocol-relative URL **[ESCALATE]** | TheGuardians |
| DEP-011 | dependency-auditor | @vitest/mocker path traversal in mock redirect (test-time only) | TheFixer |

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Impact |
|-----------|-------------------|-----------|--------|
| npm dependency sprawl (no audit cadence) | DEP-001 through DEP-011 (11 findings) | `npm audit fix` both workspaces + `npm install react-router-dom@latest` | Eliminates 10–11 P2 CVEs in one operation |
| Backend observability gaps | QO-002, QO-004 | Add OTel SDK + `dependencyCheckDuration` histogram to Source/Backend | Clears 2 P2s, satisfies CLAUDE.md rule |
| FR-dependency-search unimplemented | QO-001 | Implement route OR `test.skip` with tracking comment | Restores clean CI baseline, clears P1 |

---

## Prioritised Action List

### 🚫 Block Deployment
1. **DEP-001** — `npm audit fix` in `Source/Backend` + verify Handlebars template usage → TheGuardians clearance required
2. **QO-001** — Implement `GET /api/search` or formally defer with `test.skip` → restore clean baseline

### 🔥 This Sprint
3. **All CVEs (bulk)** — `npm audit fix` in both workspaces (resolves DEP-002 through DEP-011)
4. **DEP-010** — `cd Source/Frontend && npm install react-router-dom@latest`
5. **QO-004** — Add `@opentelemetry/sdk-node` + auto-instrumentation to `Source/Backend`

### 📅 Next Sprint
6. **QO-002** — Add `dependencyCheckDuration` Histogram to `Source/Backend/src/metrics.ts`
7. **QO-003** — Expand traceability enforcer scope to include `portal/` and `platform/`
8. **QO-005** — Fix hook dependency arrays instead of suppressing the lint rule
9. **DEP-012–014** — `npm audit fix` for remaining moderate CVEs

### 📋 Backlog
10. **QO-006** — Consolidate duplicate test files into `Source/Frontend/tests/pages/`
11. **DEP-015–019** — Major version upgrade migrations (express, pino, uuid, react, react-router-dom)
12. **DEP-020** — TypeScript minor update (dev-only)

---

## Architecture Rule Compliance (Source/ scope)

| Rule | Status |
|------|--------|
| No `console.log` in production source | ✅ PASS |
| No hardcoded secrets | ✅ PASS |
| Every FR needs `// Verifies:` comment | ✅ PASS (Source/ only) |
| All list endpoints return `{data: T[]}` | ✅ PASS |
| No direct DB calls from route handlers | ✅ PASS |
| Prometheus metrics at `/metrics` | ✅ PASS (histogram gap — QO-002) |
| OpenTelemetry tracing | ❌ FAIL (QO-004) |
| Shared types single source of truth | ✅ PASS |
| No empty catch blocks | ✅ PASS |
| No files > 500 lines | ✅ PASS |

---

## P3 / P4 Summary

| ID | Sev | Title |
|----|-----|-------|
| QO-005 | P3 | eslint-disable suppressions for react-hooks/exhaustive-deps |
| QO-006 | P3 | Duplicate test files for WorkItemDetailPage + WorkItemListPage |
| DEP-012 | P3 | baseline-browser-mapping process termination on invalid input |
| DEP-013 | P3 | body-parser size limit bypass |
| DEP-014 | P3 | @babel/core arbitrary file read via sourceMappingURL |
| DEP-015 | P3 | express 4.22.1 → 5.2.1 (1 major behind) |
| DEP-016 | P3 | pino 8.21.0 → 10.3.1 (2 majors behind) |
| DEP-017 | P3 | uuid 9.0.1 → 14.0.2 (5 majors behind) |
| DEP-018 | P3 | react/react-dom 18.3.1 → 19.3.0 |
| DEP-019 | P3 | react-router-dom 6.30.3 → 7.18.4 + linked to DEP-010 |
| DEP-020 | P4 | TypeScript minor versions behind (dev-only) |

---

## Outputs

| File | Description |
|------|-------------|
| `inspector-report.md` | This file — synthesis summary |
| `Teams/TheInspector/findings/audit-2026-09-27-C.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-09-27.json` | Structured bug backlog with escalations array |

---

*Generated by TheInspector · team-leader · run-20260927-080255 · 2026-09-27*
