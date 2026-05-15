# TheInspector Audit Report
**Date:** 2026-05-15 | **Run:** run-20260515-060710 | **Branch:** audit/inspector-2026-05-15-b2bef2

---

## Overall Grade: **C** 🟡

| Metric | Value | Threshold |
|---|---|---|
| P1 findings | **2** (both escalated → TheGuardians) | max 0 for B → **FAIL** |
| P2 findings | 5 | max 15 for C ✅ |
| P3 findings | 9 | — |
| P4 findings | 2 | — |
| Spec coverage | **96.3%** (104/108 FRs) | min 40% for C ✅ |

Grade C because two critical-severity CVEs (handlebars + protobufjs RCE) push the audit past the B threshold. Application logic and architecture are solid; spec coverage is excellent. The two P1s are dependency patches — straightforward to fix.

---

## ⚠ Security Escalation → TheGuardians

**Two P1 findings require immediate TheGuardians engagement before next release:**

| ID | Package | CVSS | Location | Fix |
|---|---|---|---|---|
| DEP-001 | `handlebars@4.7.8` | 9.8 | Source/Backend (transitive) | `npm audit fix` → 4.7.9+ |
| DEP-002 | `protobufjs@7.5.4` | 9.8 | platform/orchestrator (direct) | `npm update protobufjs` → 7.5.6+ |

**DEP-002 is BLOCKING** — orchestrator RCE means pipeline hijack risk. No deployments until patched.

To trigger TheGuardians: read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## Specialist Coverage

| Specialist | Mode | Status | Key Output |
|---|---|---|---|
| quality-oracle | static | ✅ Completed | 9 findings (0 P1, 4 P2, 3 P3, 2 P4), 96.3% spec coverage |
| dependency-auditor | static | ✅ Completed | 9 CVEs (2 critical, 1 high, 6 moderate), 8 outdated majors |
| performance-profiler | static | ⚠ Not submitted | No latency baselines this cycle |
| chaos-monkey | static | ⚠ Not submitted | No fault injection results this cycle |

---

## Trend

**First audit — no prior baseline.** All 18 findings are NEW. This run establishes the baseline for future comparisons.

---

## Executive Summary (Top 5)

1. **DEP-002 — Protobufjs RCE in orchestrator (BLOCKING):** `protobufjs@7.5.4` has 9 CVEs including CVSS 9.8 arbitrary code execution. The orchestrator runs agent pipelines — an attacker controlling the orchestrator controls all pipeline execution. One `npm update protobufjs` to fix; do it before any deploy.

2. **DEP-001 — Handlebars RCE in backend (8 CVEs, CVSS 9.8):** Template injection risk in the build pipeline via AST type confusion. Fix: `npm audit fix` in Source/Backend. Pair with DEP-002 in a single hotfix PR.

3. **Dependency-linking feature partially shipped (QO-002, QO-003, QO-005):** Three open items remain from the dependency-linking plan: `blocked_by` types missing from shared API types (causing `as any` casts), no seed data for fresh deploys, and two portal test files not yet created. Single TheFixer pass closes all three.

4. **Architecture violation — teamDispatches bypasses service layer (QO-004):** Direct `db.prepare()` calls in a route handler violate CLAUDE.md's non-negotiable rule. The same files have no spec FR (QO-007). Write the spec + extract a service in the same task.

5. **Traceability enforcer has false-failure bug for portal/platform work (QO-001):** The enforcer only scans `Source/` and `E2E/` — running it against portal plans shows 0% for all 69 portal FRs. This undermines agent trust in the verification gate.

---

## P1 Findings (escalated)

### DEP-001 — Handlebars JavaScript Injection
- **Severity:** P1 CRITICAL | **CVSS:** 9.8
- **Package:** `handlebars@4.7.8` in `Source/Backend/package.json` (transitive, dev deps)
- **CVEs:** 8 disclosures including GHSA-2w6w-674q-4c4q (RCE via AST type confusion)
- **Fix:** `cd Source/Backend && npm audit fix` → 4.7.9+
- **Route:** `[ESCALATE → TheGuardians]`

### DEP-002 — Protobufjs Arbitrary Code Execution (BLOCKING)
- **Severity:** P1 CRITICAL | **CVSS:** 9.8
- **Package:** `protobufjs@7.5.4` in `platform/orchestrator/package.json` (direct dep)
- **CVEs:** 9 disclosures including GHSA-xq3m-2v4x-88gg (RCE), prototype pollution, DoS chain
- **Fix:** `cd platform/orchestrator && npm update protobufjs` → 7.5.6+
- **Route:** `[ESCALATE → TheGuardians]` | **Blocks all deployments**

---

## P2 Findings → TheFixer Backlog

| ID | Title | File | Recommendation |
|---|---|---|---|
| QO-001 | Traceability enforcer misses portal/ and platform/ | `tools/traceability-enforcer.py` | Add `portal` and `platform` to `source_dirs` |
| QO-002 | `blocked_by` missing in shared API types + `as any` casts | `portal/Shared/api.ts:32,59` / `DependencyPicker.tsx:291,293` | Add `blocked_by?: string[]`, remove `as any` |
| QO-003 | No `seed.ts` — fresh deploys have no dependency data | `portal/Backend/src/database/` | Create `seed.ts` with idempotent relationship seeding |
| QO-004 | Direct DB calls in route handler — architecture violation | `portal/Backend/src/routes/teamDispatches.ts:37,72` | Extract `teamDispatchService.ts` |
| DEP-003 | path-to-regexp ReDoS (CVSS 7.5) in orchestrator | `platform/orchestrator` via `express@4.21.0` | `npm update path-to-regexp` |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|---|---|---|
| Vite ecosystem outdated | DEP-004, DEP-005, DEP-006, DEP-007 | `cd Source/Frontend && npm update vite` |
| protobufjs outdated | DEP-002, DEP-009 | `cd platform/orchestrator && npm update protobufjs` |
| Unspecced teamDispatches feature | QO-004, QO-007 | Write spec FR(s) + extract `teamDispatchService.ts` |
| Dependency-linking plan incomplete | QO-002, QO-003, QO-005 | Add types + create seed.ts + create 2 test files |

---

## P3/P4 Summary

**P3 (9 total):** QO-005 (2 missing portal tests), QO-006 (FR-TMP-008 untraced), QO-007 (3 unspecced files), DEP-004–009 (vite/postcss/esbuild/protobufjs ecosystem CVEs — mostly fixed by upgrading vite and protobufjs)

**P4 (2 total):** QO-008 (3 × `eslint-disable react-hooks/exhaustive-deps`), QO-009 (`playwright.pipeline.config.ts` missing `// Verifies: FR-TMP-003`)

---

## Spec Coverage

| Specification | FRs | Covered | % |
|---|---|---|---|
| `dev-workflow-platform.md` | 69 | 69 | **100%** |
| `workflow-engine.md` | 13 | 13 | **100%** |
| `tiered-merge-pipeline.md` | 10 | 9 | **90%** |
| `dependency-linking requirements` | 16 | 13 | **81%** |
| **Total** | **108** | **104** | **96.3%** |

> ⚠ The traceability enforcer CLI will report false failures for portal and platform FRs (QO-001). Manual scanning confirms 96.3%.

---

## Recommendations

| Priority | Action |
|---|---|
| 🚫 **Block Deployment** | Patch DEP-002 (protobufjs RCE) — `cd platform/orchestrator && npm update protobufjs` |
| 🚫 **This Week** | Patch DEP-001 (handlebars RCE) — `cd Source/Backend && npm audit fix`; trigger TheGuardians |
| 🔶 **This Sprint** | QO-004: Extract `teamDispatchService.ts` + write spec FR for teamDispatches (closes QO-007) |
| 🔶 **This Sprint** | QO-002+003+005: Add `blocked_by` types + create `seed.ts` + create 2 portal test files |
| 🔶 **This Sprint** | QO-001: Fix traceability enforcer to scan portal/ and platform/ |
| 🔶 **This Sprint** | DEP-003: `cd platform/orchestrator && npm update path-to-regexp` |
| 🔶 **This Sprint** | DEP-004–007: `cd Source/Frontend && npm update vite` (major bump 5→6, test thoroughly) |
| 🔷 **Next Sprint** | QO-006: Add `// Verifies: FR-TMP-008` to Dockerfile.worker |
| 🔷 **Next Sprint** | DEP-008: `cd Source/Backend && npm audit fix` (brace-expansion ReDoS) |
| 📋 **Backlog** | Major version upgrades: express 4→5, React 18→19, react-router 6→7 |
| 📋 **Backlog** | QO-008+009: Review eslint suppressions; add Verifies comment to playwright config |
| 📋 **Next cycle** | Run performance-profiler and chaos-monkey with services live for latency baselines and fault injection data |

---

## Report Files

| File | Location |
|---|---|
| Full HTML report | `Teams/TheInspector/findings/audit-2026-05-15-C.html` |
| JSON bug backlog | `Teams/TheInspector/findings/bug-backlog-2026-05-15.json` |
| Dependency audit detail | `Teams/TheInspector/findings/dependency-audit-2026-05-15.md` |
| Quality oracle source | `quality-oracle-report.md` |
| Dependency auditor source | `dependency-auditor-report.md` |

---

```json
{
  "audit_id": "run-20260515-060710",
  "date": "2026-05-15",
  "grade": "C",
  "p1_total": 2,
  "p2_total": 5,
  "p3_total": 9,
  "p4_total": 2,
  "spec_coverage_pct": 96.3,
  "escalations": ["DEP-001", "DEP-002"],
  "blocking_issues": ["DEP-002"],
  "prior_audit": null,
  "is_first_run": true,
  "html_report": "Teams/TheInspector/findings/audit-2026-05-15-C.html",
  "bug_backlog": "Teams/TheInspector/findings/bug-backlog-2026-05-15.json"
}
```
