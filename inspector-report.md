# TheInspector Audit Report — 2026-09-03

**Grade: F** | Run: `run-20260903-071035` | Branch: `audit/inspector-2026-09-03-a9d03b`

---

## Overall Score

| Metric | Value |
|--------|-------|
| **Grade** | **F** (5 P1 · 6 P2 · 11 P3 · 15% spec coverage) |
| Specialists run | quality-oracle (static), dependency-auditor (static) |
| Specialists skipped | performance-profiler, chaos-monkey (services offline) |
| Spec coverage (Specifications/) | **15%** — Grade D floor per spec metric alone |
| Total CVEs | **54** (5 critical, 31 high, 12 moderate, 6 low) |
| Prior audit | None (first audit) |

**Grading rationale:** 5 P1 findings include 3 RCE vulnerabilities with CVSS 9.8. The config grades D for `max_p1: 999`; however, exploitable RCE + critical domain failure triggers **F**. The dependency-auditor independently assigned F. Spec coverage of 15% falls below every threshold (A=80%, B=60%, C=40%).

---

## ⚠️ ESCALATION → TheGuardians

**Branch:** `audit/inspector-2026-09-03-a9d03b`  
**Audit ID:** `run-20260903-071035`  
**Trigger condition:** 3 RCE vulnerabilities with CVSS 9.8 — must be reviewed before next deployment.

| Finding | Package | CVSS | Summary |
|---------|---------|------|---------|
| DEP-001 | handlebars ≤4.7.8 | 9.8 | JavaScript injection via AST type confusion — RCE |
| DEP-002 | vitest <3.2.6 | 9.8 | Arbitrary file read & code execution via UI server |
| DEP-003 | protobufjs (transitive) | — | gRPC deserialization RCE |
| DEP-006 | form-data 4.0.0–4.0.5 | 7.5 | CRLF injection → HTTP request smuggling (conditional) |

**Action:** Read `Teams/TheGuardians/team-leader.md` and trigger a full security audit targeting an ephemeral isolated environment.

---

## P1 Findings (Block Deployment)

### QO-001 — Catastrophic Spec Drift
- **Severity:** P1 | **Category:** spec-drift / architecture-violation
- **Detail:** Zero of 74 canonical FRs in `Specifications/dev-workflow-platform.md` are traced in `Source/`. The codebase traces only to `Plans/self-judging-workflow/requirements.md` (active plan, 100% covered). Architecture rule "Specs are source of truth" violated.
- **Fix:** Supersede old spec OR promote FR-WF-001..013 into `Specifications/workflow-engine.md` with formal IDs. Update traceability-enforcer to scan `Specifications/`.
- **Route:** TheFixer / requirements-reviewer | **Sprint:** NEXT

### QO-002 — GET /api/search Not Wired
- **Severity:** P1 | **Category:** broken feature / untested
- **Detail:** `GET /api/search` is not registered in `app.ts`. Test file (`search.test.ts:3–6`) documents this explicitly. Frontend `client.ts:100` calls this endpoint for DependencyPicker typeahead — silently 404ing in production.
- **Fix:** Register `searchRouter` in `app.ts`; implement `findAll()` filter. ~30 min.
- **Route:** TheFixer (backend-coder) | **Sprint:** BLOCK DEPLOYMENT

### DEP-001 — Handlebars RCE (CVSS 9.8) `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **Package:** handlebars ≥4.0.0 ≤4.7.8
- **Detail:** JavaScript injection via AST type confusion. Multiple CVEs (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r). Network-accessible, no auth required.
- **Fix:** `npm update handlebars` → ≥4.7.9 in Source/Backend

### DEP-002 — Vitest Arbitrary File Read & Execution (CVSS 9.8) `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **Package:** vitest <3.2.6
- **Detail:** GHSA-5xrq-8626-4rwp — Vitest UI server allows any network script to read arbitrary files and execute code on developer machines.
- **Fix:** `npm update vitest` → ≥3.2.6 in portal/Backend, portal/Frontend. Disable Vitest UI in CI.

### DEP-003 — protobufjs RCE via gRPC Deserialization `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **Package:** protobufjs (transitive)
- **Detail:** Malformed protobuf messages trigger code execution. Affects platform/orchestrator — a compromised orchestrator means attacker-controlled agent dispatch.
- **Fix:** `npm update protobufjs` in platform/orchestrator, portal/Backend.

---

## P2 Findings (This Sprint)

| ID | Title | Fix | Route |
|----|-------|-----|-------|
| QO-003 | Traceability enforcer blind to `Specifications/` — false PASSED | Add `--dir Specifications/` to enforcer | TheFixer |
| QO-004 | `workflow-engine.md` has no formal FR IDs | Add FR-WF-* table to spec file | TheFixer / requirements-reviewer |
| QO-005 | All 12 frontend test files missing `// Verifies:` comments | Add FR mapping headers | TheFixer (frontend-coder) |
| DEP-004 | brace-expansion exponential DoS (CVSS 7.5) | `npm update brace-expansion` ≥1.1.18 | TheFixer |
| DEP-005 | browserslist memory exhaustion in build (CVSS 7.5) | `npm update browserslist` ≥4.28.7 | TheFixer |
| DEP-006 | form-data CRLF injection → HTTP smuggling (CVSS 7.5) `[ESCALATE → TheGuardians]` | `npm update form-data` ≥4.0.6 | TheGuardians |

---

## P3 Findings (Backlog)

| ID | Title | Package / File |
|----|-------|---------------|
| QO-006 | FR-dependency-seed has no source reference | Specifications/dev-workflow-platform.md |
| QO-007 | 2 eslint-disable suppressions without justification | useWorkItems.ts:63, DependencyPicker.tsx:82 |
| QO-008 | Hardcoded localhost:4200 fallback in DebugPortalPage | DebugPortalPage.tsx:5 |
| DEP-007 | React Router open redirect (GHSA-2j2x-hqr9-3h42) | @remix-run/router <1.23.3 |
| DEP-008 | PostCSS XSS via </style> in style tag | postcss (transitive) |
| DEP-009 | nanoid non-secure random generator | nanoid (transitive) |
| DEP-010 | vite path traversal in optimized deps | vite (direct) |
| DEP-011 | esbuild CORS bypass in dev server (≤0.24.2) | esbuild (transitive) |
| DEP-012 | @babel/core arbitrary file read via sourceMappingURL | @babel/core ≤7.29.0 |
| DEP-013 | js-yaml quadratic DoS via YAML merge keys | js-yaml (transitive) |
| DEP-014 | body-parser invalid limit disables size enforcement | body-parser <1.20.6 |

---

## Spec Coverage

| Source | FRs | Traced | % |
|--------|-----|--------|---|
| Plans/self-judging-workflow/ (active plan) | 13 | 13 | **100%** ✅ |
| Specifications/dev-workflow-platform.md | 90 | 15 (dep only) | **20%** ❌ |
| Specifications/tiered-merge-pipeline.md | 10 | 0 | **0%** ❌ |
| Specifications/workflow-engine.md | 0 (narrative) | N/A | N/A |
| **TOTAL vs Specifications/** | **~100** | **~15** | **15%** ❌ |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|----------|-----------|
| Spec infrastructure not enforced | QO-001, QO-003, QO-004, QO-005 | Migrate FRs into Specifications/ + update enforcer |
| Vulnerable dependency versions | DEP-001..006 | `npm update` across all workspaces |
| Dev-toolchain RCE cluster | DEP-001, DEP-002, DEP-011 | Upgrade vitest ≥3.2.6, handlebars ≥4.7.9, esbuild ≥0.24.3 |
| Unimplemented route with existing test | QO-002 | Register searchRouter in app.ts |

---

## Deliverables

| File | Path |
|------|------|
| HTML Report (16 sections) | `Teams/TheInspector/findings/audit-2026-09-03-F.html` |
| Bug Backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-09-03.json` |
| This report | `inspector-report.md` |

---

## Trend

**First audit — no baseline.** All 22 findings are NEW. Target: grade C or above on next run (requires resolving all 5 P1s and reducing P2s below 15).

---

*Generated by TheInspector Team Leader · `run-20260903-071035` · 2026-09-03*
