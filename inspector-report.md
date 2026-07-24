# TheInspector Health Report — 2026-07-24

**Grade: D** · Audit ID: `audit-2026-07-24-D` · Run: `run-20260724-053420`  
Branch: `audit/inspector-2026-07-24-a6276b` · Scope: Full codebase · Mode: Static (services offline)

---

## Grading

| Threshold | Requirement | Actual | Result |
|-----------|-------------|--------|--------|
| A | max 0 P1, max 3 P2, ≥80% spec coverage | 5 P1, 13 P2, 0% coverage | ❌ |
| B | max 0 P1, max 8 P2, ≥60% spec coverage | 5 P1, 13 P2, 0% coverage | ❌ |
| C | max 2 P1, max 15 P2, ≥40% spec coverage | **5 P1** (exceeds limit of 2) | ❌ |
| **D** | anything worse than C | **5 P1 / 13 P2 / 13 P3 / 1 P4** | ✅ ASSIGNED |

---

## Specialists

| Specialist | Mode | Grade | P1 | P2 | P3 | P4 |
|------------|------|-------|----|----|----|----|
| quality-oracle | static | D | 2 | 4 | 5 | 0 |
| dependency-auditor | static | C | 3 | 9 | 8 | 1 |
| performance-profiler | NOT RUN | — | — | — | — | — |
| chaos-monkey | NOT RUN | — | — | — | — | — |
| **TOTAL** | — | **D** | **5** | **13** | **13** | **1** |

> **Not run:** performance-profiler and chaos-monkey require backend service at `http://localhost:3001`. Services were offline during this audit. Re-run with services online for dynamic coverage.

---

## ⚠️ Escalation → TheGuardians

**4 findings require TheGuardians security audit before next release:**

| ID | Package | CVE | CVSS | Type |
|----|---------|-----|------|------|
| DEP-001 | vitest ≤3.2.5 | GHSA-5xrq-8626-4rwp | 9.8 | RCE via UI server |
| DEP-002 | handlebars 4.0–4.7.8 | GHSA-2w6w-674q-4c4q | 9.8 | Template injection RCE |
| DEP-003 | protobufjs ≤7.6.4 | GHSA-xq3m-2v4x-88gg | 9.8 | Code generation RCE |
| DEP-008 | react-router-dom 6.6.3–6.30.4 | GHSA-jjmj-jmhj-qwj2 | 6.9 | Open redirect → XSS |

To trigger TheGuardians: read `Teams/TheGuardians/team-leader.md` and follow exactly.  
Target: ephemeral isolated environment (required).  
Non-security findings → TheFixer (see bug backlog below).

---

## Executive Summary (Top 5)

1. **🔴 3 RCE vulnerabilities (CVSS 9.8)** — vitest, handlebars, protobufjs — block deployment, trigger TheGuardians
2. **🔴 Zero canonical spec coverage** — Source/ traces to Plan IDs (`FR-WF-*`), not Specification IDs (`FR-001…FR-069`) — CLAUDE.md architecture rule violated structurally
3. **🟠 69 requirements in dev-workflow-platform.md entirely unimplemented** — spec describes a SQLite system that was pivoted away from; it will misdirect agents
4. **🟠 8 additional high-severity CVEs** (CVSS 5.3–7.5) — react-router XSS, Vite path traversal, OTel DoS, gRPC crash, WebSocket DoS — most fixable with `npm audit fix --workspaces`
5. **🟡 Missing Prometheus histogram** (`dependencyCheckDuration`) — SLO alerting for dependency check performance impossible

---

## Cross-Reference Map

Root causes spanning multiple findings — one fix closes the group:

| Group | Root Cause | Findings | Fix Impact |
|-------|-----------|----------|-----------|
| XR-1 | Dev tooling suite outdated (vitest/vite/ws) | DEP-001, DEP-007, DEP-012 | 1 P1 + 2 P2 |
| XR-2 | @opentelemetry family 175+ versions behind | DEP-003, DEP-004, DEP-005, DEP-019, DEP-020 | 1 P1 + 2 P2 + 2 P3 |
| XR-3 | FR ID namespace fragmentation (3 parallel systems) | QO-001, QO-002, QO-010, QO-011 | 2 P1 + 2 P3 |
| XR-4 | Stale `portal/` doc paths (should be `Source/`) | QO-006, QO-011 | 1 P2 + 1 P3 |

---

## Recommendations

### 🛑 Block Deployment
- `DEP-001` Upgrade vitest to ≥3.2.6: `cd Source/Frontend && npm install vitest@latest`
- `DEP-002` Fix handlebars RCE: `cd Source/Backend && npm audit fix`
- `DEP-003` Fix protobufjs RCE: `cd portal/Backend && npm install protobufjs@latest`
- Trigger TheGuardians security audit

### 🔶 This Sprint
- `DEP-008` Upgrade react-router-dom ≥7.18.0
- `DEP-004/005` (XR-2) Upgrade @opentelemetry/auto-instrumentations-node + @grpc/grpc-js
- `DEP-006/007` Upgrade postcss and vite
- `DEP-009/010/011/012` Run `npm audit fix --workspaces`
- `QO-006` Fix stale `portal/` paths in Plans/dependency-linking (~5 min, solo session)
- `QO-003` Add `dependencyCheckDuration` histogram to `Source/Backend/src/metrics.ts`
- `QO-004` Create `Source/Backend/src/seed.ts` with idempotent seeding

### 🟡 Next Sprint
- `QO-001/002/010` (XR-3) Add FR-WF-* IDs to `Specifications/workflow-engine.md`; mark dev-workflow-platform.md FR-001…FR-069 as deferred
- `DEP-020` Plan @opentelemetry/* major upgrade (175 versions behind)
- `QO-005` Extend traceability enforcer to scan `platform/`
- Plan Express 4.x → 5.x and React 18.x → 19.x migrations
- Rerun TheInspector with services online for dynamic coverage

### 📋 Backlog
- `QO-007` Fix DebugPortalPage.tsx traceability comment
- `QO-008` Fix 2 `eslint-disable` suppressions (useCallback/memo fix)
- `QO-009` Consolidate duplicate test files for WorkItemListPage + WorkItemDetailPage
- `QO-011` Update api-contracts.md phantom FR-070…FR-085 references
- Add `npm audit --audit-level=moderate` to merge gate CI

---

## Trend

**First audit — no prior baseline.** All 32 findings tagged NEW.  
Baseline established: **D** (5 P1 / 13 P2 / 13 P3 / 1 P4) — 2026-07-24.

---

## Report Artifacts

| Artifact | Path |
|----------|------|
| Full HTML report (16 sections) | `Teams/TheInspector/findings/audit-2026-07-24-D.html` |
| JSON bug backlog | `Teams/TheInspector/findings/bug-backlog-2026-07-24.json` |
| Dependency audit detail (MD) | `Teams/TheInspector/findings/dependency-audit-2026-07-24.md` |
| Dependency audit (JSON) | `Teams/TheInspector/findings/dependency-audit-2026-07-24.json` |

---

## JSON Bug Backlog

```json
{
  "audit_id": "audit-2026-07-24-D",
  "audit_date": "2026-07-24",
  "grade": "D",
  "branch": "audit/inspector-2026-07-24-a6276b",
  "summary": {
    "p1_total": 5,
    "p2_total": 13,
    "p3_total": 13,
    "p4_total": 1,
    "total_findings": 32,
    "fixed_since_prior": 0,
    "new_findings": 32,
    "spec_coverage_canonical_pct": 0,
    "cves_critical": 3,
    "cves_high": 9,
    "cves_moderate": 24,
    "escalations_to_guardians": 4
  },
  "escalations": [
    { "id": "DEP-001", "package": "vitest", "cve": "GHSA-5xrq-8626-4rwp", "cvss": 9.8,
      "title": "Arbitrary file read and execution via Vitest UI server",
      "route_to": "TheGuardians", "priority": "BLOCK DEPLOYMENT" },
    { "id": "DEP-002", "package": "handlebars", "cve": "GHSA-2w6w-674q-4c4q", "cvss": 9.8,
      "title": "JavaScript injection via AST type confusion and template injection RCE",
      "route_to": "TheGuardians", "priority": "BLOCK DEPLOYMENT" },
    { "id": "DEP-003", "package": "protobufjs", "cve": "GHSA-xq3m-2v4x-88gg", "cvss": 9.8,
      "title": "Arbitrary code execution via protobufjs code generation gadget",
      "route_to": "TheGuardians", "priority": "BLOCK DEPLOYMENT" },
    { "id": "DEP-008", "package": "react-router-dom", "cve": "GHSA-jjmj-jmhj-qwj2", "cvss": 6.9,
      "title": "Open redirect leading to XSS via protocol-relative URL",
      "route_to": "TheGuardians", "priority": "THIS SPRINT" }
  ],
  "p1_findings": [
    { "id": "DEP-001", "specialist": "dependency-auditor", "status": "NEW",
      "title": "Arbitrary file read and execution via Vitest UI server",
      "file": "Source/Frontend/package.json, portal/Frontend/package.json",
      "fix": "npm install vitest@latest in Source/Frontend and portal/Frontend" },
    { "id": "DEP-002", "specialist": "dependency-auditor", "status": "NEW",
      "title": "JavaScript injection via AST type confusion and template injection RCE",
      "file": "Source/Backend/package.json",
      "fix": "npm audit fix in Source/Backend" },
    { "id": "DEP-003", "specialist": "dependency-auditor", "status": "NEW",
      "title": "Arbitrary code execution via protobufjs code generation gadget",
      "file": "portal/Backend/package.json",
      "fix": "npm install protobufjs@latest OR upgrade @opentelemetry/sdk-node to >=0.221.0" },
    { "id": "QO-001", "specialist": "quality-oracle", "status": "NEW",
      "title": "Spec-Source ID Mismatch: Source traces to Plan IDs, not Specification IDs",
      "file": "Source/ (entire codebase)",
      "fix": "Add FR-WF-* IDs to Specifications/workflow-engine.md; update enforcer" },
    { "id": "QO-002", "specialist": "quality-oracle", "status": "NEW",
      "title": "dev-workflow-platform.md FR-001..FR-069 entirely unimplemented in Source/",
      "file": "Specifications/dev-workflow-platform.md",
      "fix": "Mark FR-001..FR-069 as deferred; add architectural pivot note" }
  ],
  "p2_findings": [
    { "id": "DEP-004", "title": "OTel Prometheus exporter DoS (CVSS 7.5)", "status": "NEW",
      "fix": "Upgrade @opentelemetry/auto-instrumentations-node to >=0.79.0" },
    { "id": "DEP-005", "title": "gRPC crash from malformed messages (CVSS 7.5)", "status": "NEW",
      "fix": "npm install @grpc/grpc-js@latest in portal/Backend" },
    { "id": "DEP-006", "title": "PostCSS arbitrary file read via CSS comment (CVSS 7.5)", "status": "NEW",
      "fix": "npm install postcss@latest in portal/Frontend" },
    { "id": "DEP-007", "title": "Vite path traversal and fs.deny bypass (CVSS 7.5)", "status": "NEW",
      "fix": "npm install vite@latest in Source/Frontend and portal/Frontend" },
    { "id": "DEP-008", "title": "React Router open redirect to XSS (CVSS 6.9)", "status": "NEW",
      "fix": "npm install react-router-dom@latest (>=7.18.0)" },
    { "id": "DEP-009", "title": "CRLF injection in form-data field names (CVSS 7.5)", "status": "NEW",
      "fix": "npm audit fix --workspaces" },
    { "id": "DEP-010", "title": "brace-expansion exponential DoS (CVSS 5.3)", "status": "NEW",
      "fix": "npm audit fix --workspaces" },
    { "id": "DEP-011", "title": "path-to-regexp ReDoS (CVSS 7.5)", "status": "NEW",
      "fix": "cd portal/Backend && npm audit fix" },
    { "id": "DEP-012", "title": "WebSocket memory exhaustion DoS (CVSS 7.5)", "status": "NEW",
      "fix": "npm audit fix --workspaces" },
    { "id": "QO-003", "title": "dependencyCheckDuration histogram missing from metrics.ts", "status": "NEW",
      "file": "Source/Backend/src/metrics.ts",
      "fix": "Add Histogram export + record timing in DependencyService" },
    { "id": "QO-004", "title": "FR-dependency-seed: no seed.ts exists", "status": "NEW",
      "file": "Source/Backend/src/ (missing)",
      "fix": "Create seed.ts with idempotent seeding logic; call on server startup" },
    { "id": "QO-005", "title": "Traceability enforcer blind to platform/ (false-negative)", "status": "NEW",
      "file": "tools/traceability-enforcer.py:78",
      "fix": "Add 'platform' to source_dirs in enforcer" },
    { "id": "QO-006", "title": "Plans/dependency-linking has stale portal/ paths", "status": "NEW",
      "file": "Plans/dependency-linking/requirements.md",
      "fix": "Find-replace portal/Backend/ -> Source/Backend/, portal/Frontend/ -> Source/Frontend/" }
  ],
  "p3_p4_summary": "13 P3 (8 moderate CVEs + 5 quality/doc findings) + 1 P4 (transitive dep sprawl informational). See full report for details.",
  "full_report": "Teams/TheInspector/findings/audit-2026-07-24-D.html",
  "full_backlog": "Teams/TheInspector/findings/bug-backlog-2026-07-24.json"
}
```
