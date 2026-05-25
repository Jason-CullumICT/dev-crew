# TheInspector Audit Report
**Audit ID:** `run-20260525-065040`  
**Date:** 2026-05-25  
**Branch:** `audit/inspector-2026-05-25-f91378`  
**Mode:** Full codebase (static — services offline)  
**Specialists:** quality-oracle · dependency-auditor  
**Skipped:** performance-profiler · chaos-monkey (services offline)

---

## 🟠 Overall Grade: D

> **Grade rationale:** 3 P1 findings exceed the C threshold (max_p1=2). Spec coverage is excellent at 99.3%. The grade is driven by 2 RCE-level transitive CVEs (remediable with `npm update`) and 1 critical tooling gap. Grade rebounds to **B** immediately upon fixing all 3 P1s.

| Metric | Value |
|--------|-------|
| P1 (Critical) | 3 |
| P2 (High) | 4 |
| P3 (Medium) | 13 |
| P4 (Info) | 3 |
| Total Findings | 23 |
| Spec Coverage | 99.3% (139/140 FRs) |
| CVEs Total | 21 |
| Escalated to TheGuardians | 2 (DEP-001, DEP-002) |
| Fixed Since Prior | 0 (first combined audit) |

---

## ⚠ Security Escalation — TheGuardians Required

Two P1 findings are injection/RCE-class vulnerabilities that require TheGuardians review before the next production deployment:

| Finding | Package | CVSS | Location | Fix |
|---------|---------|------|----------|-----|
| DEP-001 | `handlebars@≤4.7.8` | 9.8 | Source/Backend (transitive) | `npm update handlebars` to ≥4.7.9 |
| DEP-002 | `protobufjs@≤7.5.7` | 9.8 | platform/orchestrator (transitive) | `npm update protobufjs` to ≥7.5.8 |

```
⚠  ESCALATION → TheGuardians
   Finding : handlebars JavaScript injection (CVSS 9.8) + protobufjs RCE (CVSS 9.8)
   Branch  : audit/inspector-2026-05-25-f91378
   When    : before next release, or wait for the scheduled security run

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see bug-backlog-2026-05-25.json)
```

---

## P1 Findings (Critical)

### QO-001 — Traceability Enforcer Scope is Fatally Misaligned
- **Severity:** P1 · **Category:** spec-drift · **Escalate to:** TheFixer
- **File:** `tools/traceability-enforcer.py:69`
- **Detail:** The mandatory gate scans only `Source/` and `E2E/`. The `portal/` directory (implementing ~80% of all FRs) is completely invisible. Only 13 of ~140 total requirements are validated despite the gate reporting `TRACEABILITY PASSED`. Every pipeline stage depending on this gate receives a false confidence signal.
- **Fix:** Add `portal/` and `platform/` to `source_dirs`. Add `--all-plans` flag to validate all Plans/*/requirements.md. Update CLAUDE.md gate command.
- **Cross-ref:** Shares root cause with QO-004 (false positives) — both fixed by the same enforcer update.

### DEP-001 — Handlebars.js JavaScript Injection (CVSS 9.8) `[ESCALATE → TheGuardians]`
- **Severity:** P1 · **Category:** CVE
- **Package:** `handlebars@≤4.7.8` (transitive, Source/Backend)
- **CVEs:** GHSA-2w6w-674q-4c4q (9.8), GHSA-3mfm-83xf-c92r (8.1), GHSA-xhpv-hc6g-r9c6 (8.1), GHSA-xjpj-3mr7-gcpf (8.2) + 4 more
- **Impact:** Code execution if untrusted templates are compiled; XSS in template output; prototype pollution.
- **Fix:** `cd Source/Backend && npm update handlebars` — verify resolves to ≥4.7.9.

### DEP-002 — protobufjs Remote Code Execution (CVSS 9.8) `[ESCALATE → TheGuardians]` — CRITICAL BLOCKER
- **Severity:** P1 · **Category:** CVE
- **Package:** `protobufjs@≤7.5.7` (transitive, platform/orchestrator)
- **CVEs:** GHSA-xq3m-2v4x-88gg (9.8 RCE), GHSA-75px-5xx7-5xc7 (8.1), GHSA-jvwf-75h9-cwgg (7.5 DoS) + 6 more
- **Impact:** Arbitrary code execution if orchestrator accepts untrusted protobuf messages. Process-wide DoS via crafted payloads. The orchestrator is core pipeline infrastructure.
- **Fix:** `cd platform/orchestrator && npm update protobufjs` — verify resolves to ≥7.5.8. Also resolves DEP-014.

---

## P2 Findings (High)

| ID | Category | Title | File/Package | Escalate |
|----|----------|-------|-------------|---------|
| QO-002 | arch-violation | Route handlers bypass service layer | `workItems.ts, workflow.ts, intake.ts` | TheFixer |
| QO-003 | spec-drift | FR-dependency-seed unimplemented — seed.ts missing | `portal/Backend/src/database/seed.ts` (missing) | TheFixer |
| QO-004 | pattern-violation | Traceability enforcer false positives on entity IDs | `tools/traceability-enforcer.py:63` | TheFixer |
| DEP-003 | CVE (CVSS 7.5) | path-to-regexp ReDoS | `platform/orchestrator` → express → path-to-regexp | TheFixer |

---

## P3/P4 Findings (Medium/Info)

| ID | Sev | Category | Title | Location |
|----|-----|----------|-------|---------|
| QO-005 | P3 | spec-drift | FR-070-095, FR-DUP-01-13 not in Specifications/ | Specifications/dev-workflow-platform.md |
| QO-006 | P3 | pattern-violation | Unexplained eslint-disable in production frontend | DependencyPicker.tsx:82, useWorkItems.ts:63 |
| DEP-004 | P3 | CVE 5.3 | qs Query String DoS | Backend + Orchestrator (transitive) |
| DEP-005 | P3 | CVE | express via qs vulnerability (outdated) | Source/Backend, platform/orchestrator |
| DEP-006 | P3 | CVE 6.5 | brace-expansion Zero-Step Sequence Hang | Source/Backend (transitive) |
| DEP-007 | P3 | CVE 7.5 | uuid Missing Buffer Bounds Check | Backend + Orchestrator |
| DEP-008 | P3 | CVE 6.1 | PostCSS XSS via Unescaped `</style>` | Source/Frontend (transitive via vite) |
| DEP-009 | P3 | CVE | Vite Path Traversal in .map Files (dev only) | Source/Frontend |
| DEP-010 | P3 | CVE 5.3 | esbuild CORS Bypass (dev only) | Source/Frontend |
| DEP-011 | P3 | CVE 4.4 | ws Uninitialized Memory Disclosure | Source/Frontend (vitest) |
| DEP-012 | P3 | CVE | vitest/vite-node/mocker Chain CVEs | Source/Frontend |
| DEP-013 | P3 | CVE | dockerode inherits uuid vulnerability | platform/orchestrator |
| DEP-014 | P3 | CVE 5.3 | @protobufjs/utf8 Overlong UTF-8 (resolved by DEP-002 fix) | platform/orchestrator |
| QO-007 | P4 | untested | DebugPortalPage has no test coverage | Source/Frontend/src/pages/DebugPortalPage.tsx |
| DEP-015 | P4 | tech-debt | 8 packages ≥1 major version outdated | All locations |
| DEP-016 | P4 | supply-chain | Disproportionate transitive dep expansion (31x/52x) | Source/Backend, platform/orchestrator |

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Fix Impact |
|-----------|------------------|------------|------------|
| Traceability tooling under-configured | QO-001 (P1), QO-004 (P2) | Expand `source_dirs` in enforcer + blocklist + `--all-plans` | Resolves 1 P1 + 1 P2 |
| platform/orchestrator express stale | DEP-003 (P2), DEP-005 (P3) | `npm update express` in platform/orchestrator | Resolves 1 P2 + 1 P3 |
| protobufjs critically outdated | DEP-002 (P1), DEP-014 (P3) | `npm update protobufjs` to ≥7.5.8 | Resolves 1 P1 + 1 P3 |
| Frontend build toolchain (vite) outdated | DEP-008, DEP-009, DEP-010 (all P3) | `npm update vite@^8` | Resolves 3 P3 |
| vitest pulls stale chain | DEP-011, DEP-012 (both P3) | `npm update vitest@^4` | Resolves 2 P3 |

**5 root-cause fixes resolve 12 findings (52% of total).**

---

## Recommendations

### 🚫 Block Deployment
1. `cd platform/orchestrator && npm update protobufjs` → verify ≥7.5.8 (DEP-002, CVSS 9.8)
2. `cd Source/Backend && npm update handlebars` → verify ≥4.7.9 (DEP-001, CVSS 9.8)
3. Trigger TheGuardians security audit on this branch

### 🏃 This Sprint
4. Fix traceability enforcer (QO-001 + QO-004) — add `portal/`, `platform/` to source_dirs; add entity-ID blocklist
5. Create `Source/Backend/src/services/workItemService.ts` (QO-002) — route handlers must call service functions
6. Create `portal/Backend/src/database/seed.ts` (QO-003) — implement FR-dependency-seed
7. `cd platform/orchestrator && npm update express` → ≥4.22.2 (DEP-003 + DEP-005)
8. Add `npm audit` to CI/CD pipeline (fail on P1/P2)

### 📅 Next Sprint
9. Frontend batch: `npm update vite@^8 && npm update vitest@^4` (DEP-008–012)
10. Canonicalize FR-070-095 and FR-DUP-01-13 into Specifications/ (QO-005)
11. Add eslint-disable explanatory comments (QO-006) + DebugPortalPage smoke test (QO-007)
12. Batch patch remaining P3 CVEs: `npm update` across all package dirs

### 📋 Backlog
13. Major version roadmap: React 18→19, express 4→5, pino 8→10, uuid 9→14 (DEP-015)
14. Dependency hygiene audit — target 31x/52x transitive expansion (DEP-016)
15. Add Dependabot or Renovate for automated dependency update PRs
16. Re-run TheInspector with services online for latency baselines + chaos testing

---

## Spec Coverage

| Specification | FRs | Coverage | Notes |
|--------------|-----|----------|-------|
| workflow-engine.md | FR-WF-001–013 (13) | ✅ 100% | Enforcer validates |
| dev-workflow-platform.md | FR-001–069 + FR-dep-* (89) | ✅ ~99% | portal/ implements; enforcer blind |
| tiered-merge-pipeline.md | FR-TMP-001–010 (10) | ✅ 100% | platform/ implements; enforcer blind |
| Plans/ only (FR-070-095, FR-DUP-01-13) | ~38 | ⚠ Impl not in Specs/ | QO-005 |
| **Unimplemented** | FR-dependency-seed (1) | ❌ 0% | seed.ts missing (QO-003) |

**Architecture rule compliance:** 8/10 passing. Violations: QO-001 (enforcer scope), QO-002 (route bypass).

---

## Artefacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-05-25-D.html` | Full HTML report (all 16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-05-25.json` | Structured JSON backlog for TheFixer |
| `Teams/TheInspector/findings/audit-2026-05-25-B.md` | Quality Oracle detailed findings |
| `Teams/TheInspector/findings/dependency-audit-20260525.md` | Dependency Auditor detailed findings |

---

```json
{
  "audit_id": "run-20260525-065040",
  "date": "2026-05-25",
  "grade": "D",
  "p1": 3,
  "p2": 4,
  "p3": 13,
  "p4": 3,
  "spec_coverage_pct": 99.3,
  "escalated_to_guardians": ["DEP-001", "DEP-002"],
  "grade_rebound": "B after patching DEP-001, DEP-002, and fixing QO-001"
}
```
