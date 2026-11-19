# TheInspector — Audit Report
**Audit ID:** `run-20261119-101403` · **Date:** 2026-11-19 · **Branch:** `audit/inspector-2026-11-19-f82e90`

---

## Grade: D 🟠

| Threshold | Requirement | Actual | Pass? |
|-----------|-------------|--------|-------|
| Grade A | P1=0, P2≤3, coverage≥80% | P1=4, P2=7, cov=17% | ❌ |
| Grade B | P1=0, P2≤8, coverage≥60% | P1=4, P2=7, cov=17% | ❌ |
| Grade C | P1≤2, P2≤15, coverage≥40% | P1=4, cov=17% | ❌ |
| **Grade D** | Anything worse | — | ✅ |

---

## Scorecards

| Metric | Quality Oracle | Dependency Auditor | Total |
|--------|---------------|-------------------|-------|
| P1 Critical | 2 | 2 | **4** |
| P2 High | 3 | 4 | **7** |
| P3 Medium | 1 | 8 | **9** |
| P4 Low | 0 | 0 | **0** |
| Spec coverage | 17% (all plans), 0% (domain specs) | — | **17%** |
| Escalations | 0 | 3 → TheGuardians | **3** |
| Dynamic tests | — skipped — | — skipped — | **0** |

Skipped: **performance-profiler** and **chaos-monkey** (services offline at audit time).

---

## ⚠ Security Escalations → TheGuardians

The following findings meet the escalation criteria (code injection, auth bypass, redirect vulnerability) and **must be reviewed by TheGuardians before the next release**:

| ID | Severity | Finding | CVE | Trigger |
|----|----------|---------|-----|---------|
| DEP-001 | P1 | protobufjs code injection in `platform/orchestrator` | GHSA-66ff-xgx4-vchm | injection |
| DEP-002 | P1 | @grpc/grpc-js crash + certificate auth bypass in `platform/orchestrator` | GHSA-m9gg-hp2v-232j + 3 more | auth bypass |
| DEP-005 | P2 | @remix-run/router open redirect in `Source/Frontend` | GHSA-2j2x-hqr9-3h42 | missing access control |

**To trigger TheGuardians:** Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## P1 Findings

### QO-001 — Route handlers access store directly (architecture violation)
- **Severity:** P1 | **Source:** quality-oracle | **Route to:** TheFixer
- **Files:** `Source/Backend/src/routes/intake.ts`, `workItems.ts`, `workflow.ts` (18 direct store calls across 3 routes)
- **Detail:** CLAUDE.md mandates "no direct DB calls from route handlers — use the service layer." Only `dashboard.ts` complies. Routes are non-unit-testable in isolation; state invariants cannot be centrally enforced.
- **Fix:** Create `workItemService.ts` + `intakeService.ts`; routes call services only.

### QO-002 — Traceability enforcer validates only 1 of 8 plans
- **Severity:** P1 | **Source:** quality-oracle | **Route to:** TheFixer
- **File:** `tools/traceability-enforcer.py`
- **Detail:** Enforcer uses `max(req_files, key=os.path.getmtime)` — only the most recently modified plan is checked. 7 plans (125 FRs) are never validated. Regex `FR-[A-Z0-9-]+` silently drops all lowercase FR IDs (e.g., `FR-dependency-types`).
- **Fix:** Add `--all` flag; fix regex to `FR-[A-Za-z0-9-]+`.

### DEP-001 — protobufjs code injection in orchestrator `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **Source:** dependency-auditor | **CVE:** GHSA-66ff-xgx4-vchm (CWE-94)
- **File:** `platform/orchestrator/package.json` (transitive via gRPC)
- **Detail:** Arbitrary code execution via crafted protobuf messages. Affects protobufjs ≤7.5.5.
- **Fix:** `cd platform/orchestrator && npm update protobufjs`

### DEP-002 — @grpc/grpc-js crash + auth bypass in orchestrator `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **Source:** dependency-auditor | **CVEs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq, GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4
- **File:** `platform/orchestrator/package.json` (transitive)
- **Detail:** Malformed requests crash the gRPC server; `getAuthContext` returns unauthorized certificates as authorized. Affects @grpc/grpc-js 1.14.0–1.14.4.
- **Fix:** `cd platform/orchestrator && npm update @grpc/grpc-js`

---

## P2 Findings

| ID | Category | Title | File | Route |
|----|----------|-------|------|-------|
| QO-003 | spec-drift | 7 plans (106+ FRs) have zero `Verifies:` in source | Plans/*/requirements.md | TheFixer |
| QO-004 | untested | 4 frontend components have no test files (Layout, PriorityBadge, StatusBadge, TypeBadge) | Source/Frontend/src/components/ | TheFixer |
| QO-005 | spec-drift | FR ID naming fragmented across 3 incompatible conventions | Plans/ (multiple) | TheFixer |
| DEP-003 | cve | body-parser DoS via compressed requests w/ trailing bytes (CVSS 7.5) | Backend + Orchestrator | TheFixer |
| DEP-004 | cve | path-to-regexp ReDoS via multiple route params (CVSS 7.5) | Orchestrator | TheFixer |
| DEP-005 | cve | @remix-run/router open redirect CWE-601 `[ESCALATE → TheGuardians]` | Source/Frontend | TheGuardians |
| DEP-006 | outdated | pino logger 2 major versions behind (8.17.0 vs 10.4.0) | Source/Backend | TheFixer |

---

## P3 Findings

| ID | Category | Title | Fix |
|----|----------|-------|-----|
| QO-006 | pattern-violation | 2 eslint-disable suppressions without rationale | Add inline explanation comments |
| DEP-007 | cve | browserslist unbounded memory growth DoS | `npm update browserslist` |
| DEP-008 | cve | form-data CRLF injection in multipart fields | `npm update form-data` |
| DEP-009 | cve | postcss arbitrary file read via sourceMappingURL | `npm update postcss` |
| DEP-010 | cve | nanoid infinite loops + integer overflow | `npm update nanoid` |
| DEP-011 | outdated | uuid 5 major versions behind (9.0.0 vs 14.0.3) | `npm update uuid` |
| DEP-012 | cve | brace-expansion 5 DoS CVEs | `npm update brace-expansion` |
| DEP-013 | outdated | React ecosystem 1 major behind (18.x vs 19.x) | Plan upgrade cycle |
| DEP-014 | outdated | Orchestrator deps 1 major behind (dockerode, express, multer) | `npm update` in orchestrator |

---

## What Passes Cleanly

- ✅ No `console.log` in production source (logger abstraction in use)
- ✅ No hardcoded secrets or credentials found
- ✅ No disabled tests (skipped/xdescribe/xit)
- ✅ All backend test files carry `Verifies:` comments
- ✅ `self-judging-workflow` plan — 100% traced, enforcer passes
- ✅ `dashboard.ts` route correctly routes through service layer
- ✅ No TODO/FIXME/HACK comments in source
- ✅ No files exceed 500 lines
- ✅ No GPL/AGPL license violations
- ✅ No suspicious post-install scripts

---

## Reports

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-11-19-D.html` | Full HTML report (16 sections, risk matrix, cross-ref map) |
| `Teams/TheInspector/findings/bug-backlog-2026-11-19.json` | Machine-readable backlog (see below) |
| `Teams/TheInspector/findings/dependency-audit-2026-11-19.md` | Full dependency audit detail (14 findings, CVE IDs, CVSS scores) |

---

## Bug Backlog JSON

```json
{
  "audit_id": "run-20261119-101403",
  "audit_date": "2026-11-19",
  "grade": "D",
  "p1_total": 4,
  "p2_total": 7,
  "p3_total": 9,
  "p4_total": 0,
  "spec_coverage_pct": 17,
  "domain_spec_coverage_pct": 0,
  "specialists_run": ["quality-oracle", "dependency-auditor"],
  "specialists_skipped": ["performance-profiler", "chaos-monkey"],
  "skip_reason": "Services offline at audit time",
  "escalations": [
    { "finding_id": "DEP-001", "team": "TheGuardians", "trigger": "injection" },
    { "finding_id": "DEP-002", "team": "TheGuardians", "trigger": "auth bypass" },
    { "finding_id": "DEP-005", "team": "TheGuardians", "trigger": "missing access control" }
  ]
}
```

Full JSON with all 20 findings: `Teams/TheInspector/findings/bug-backlog-2026-11-19.json`
