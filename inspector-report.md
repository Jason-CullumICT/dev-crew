# TheInspector — Synthesised Health Report

**Date:** 2026-09-02  
**Branch:** `audit/inspector-2026-09-02-1692ae`  
**Run ID:** `run-20260902-070912`  
**Full HTML report:** `Teams/TheInspector/findings/audit-2026-09-02-D.html`  
**Bug backlog JSON:** `Teams/TheInspector/findings/bug-backlog-2026-09-02.json`

---

## Overall Grade: **D** 🟠

| Threshold | A | B | C | **D** |
|-----------|---|---|---|-------|
| max P1 | 0 | 0 | 2 | **1 ✗ (exceeds B/A; within C)** |
| max P2 | 3 | 8 | 15 | **20 ✗ (exceeds C threshold)** |
| min spec coverage | 80% | 60% | 40% | **93% ✓** |

→ Spec coverage is excellent. Dependency vulnerabilities dominate the grade.

---

## Scorecards

| P1 Critical | P2 High | P3 Medium | P4 Low | Spec Coverage | Dynamic Runs |
|:-----------:|:-------:|:---------:|:------:|:-------------:|:------------:|
| **1** | **20** | **3** | **1** | **~93%** | 0 (services offline) |

---

## 🚨 P1 Escalation — [ESCALATE → TheGuardians]

**DEP-001 · protobufjs Remote Code Execution · CVSS 9.8**

- **Location:** `portal/Backend/package.json` → `@opentelemetry/auto-instrumentations-node@0.40.0` → vulnerable `protobufjs` pin
- **Risk:** Unauthenticated RCE — any crafted protobuf/gRPC message can achieve arbitrary code execution on the portal backend server
- **Fix:** Upgrade `@opentelemetry/auto-instrumentations-node` → **0.80.0+** and `@opentelemetry/sdk-node` → **0.222.0+**
- **Action required:** **Block deployment.** Escalate to TheGuardians for runtime threat assessment.

```
⚠️  ESCALATION → TheGuardians
   Finding : protobufjs RCE (CVSS 9.8) in portal/Backend
             Root: @opentelemetry/auto-instrumentations-node@0.40.0
   Branch  : audit/inspector-2026-09-02-1692ae
   When    : Before next release — do not deploy portal/Backend until resolved
   Action  : Read Teams/TheGuardians/team-leader.md and follow it exactly.
             Target: ephemeral isolated environment (required).
   Non-security findings → TheFixer backlog (see bug-backlog-2026-09-02.json)
```

---

## Specialist Summary

| Specialist | Mode | Grade | P1 | P2 | P3 | P4 |
|-----------|------|-------|----|----|----|----|
| quality-oracle | Static | B | 0 | 3 | 3 | 1 |
| dependency-auditor | Static | D | **1** | 17 | 0 | 0 |
| performance-profiler | **Skipped** (service offline) | — | — | — | — | — |
| chaos-monkey | **Skipped** (service offline) | — | — | — | — | — |

---

## P1 Finding

| ID | Title | CVSS | Source | Route |
|----|-------|------|--------|-------|
| DEP-001 | protobufjs RCE via @opentelemetry/auto-instrumentations-node@0.40.0 | 9.8 | dependency-auditor | **[ESCALATE → TheGuardians]** |

---

## P2 Findings (20 total — route to TheFixer)

| ID | Category | Summary |
|----|----------|---------|
| QO-001 | spec-drift | `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by?: string[]` → `as any` cast in DependencyPicker.tsx |
| QO-002 | spec-drift | `portal/Backend/src/database/seed.ts` missing — FR-dependency-seed unimplemented |
| QO-003 | architecture-violation | Traceability enforcer blindspot: portal/ and platform/ not scanned (85+ FRs invisible) |
| DEP-002 | vulnerability | brace-expansion — 4 DoS CVEs |
| DEP-003 | vulnerability | browserslist — memory/crash CVEs |
| DEP-004 | vulnerability | path-to-regexp — ReDoS (production) |
| DEP-005 | vulnerability | form-data — CRLF injection |
| DEP-006 | vulnerability | nanoid — infinite loop DoS |
| DEP-007 | vulnerability | @grpc/grpc-js — 2 crash CVEs (malformed messages) |
| DEP-008 | vulnerability | @opentelemetry/auto-instrumentations-node — Prometheus crash |
| DEP-009 | vulnerability | @opentelemetry/sdk-node — Prometheus crash |
| DEP-010 | outdated-major | portal/Backend OpenTelemetry stack 2+ majors behind |
| DEP-011 | outdated-major | uuid 5 major versions behind (portal/Backend, Source/Backend) |
| DEP-012 | outdated-major | pino 2 majors behind (Source/Backend) |
| DEP-013 | outdated-major | React/React-Router 1 major behind (Source/Frontend) |
| *(+5 additional per-project CVE instances in portal/Frontend, Source/Frontend, platform/orchestrator)* | | |

---

## P3/P4 Findings

| ID | Sev | Category | Summary |
|----|-----|----------|---------|
| QO-004 | P3 | untested | FR-TMP-001 / FR-TMP-008 missing `// Verifies:` comments |
| QO-005 | P3 | architecture-violation | Dual logger modules in Source/Backend — ambiguous imports |
| QO-006 | P3 | pattern-violation | 2 undocumented `eslint-disable` suppressions in production code |
| QO-007 | P4 | test-coverage | FR-TMP-002 prompt injection guard has comment only — no automated test |

---

## Cross-Reference Map (Root Causes)

| Root Cause | Findings Affected | Single Fix |
|------------|------------------|-----------|
| OpenTelemetry version lag (portal/Backend) | DEP-001, DEP-008, DEP-009 | Upgrade `@opentelemetry/auto-instrumentations-node` → 0.80.0+ |
| Express ecosystem lag | DEP-004, DEP-005 | Upgrade express across all projects |
| FR-dependency-api-types incomplete | QO-001, QO-002 | Add `blocked_by` field to shared types + create seed.ts |
| Traceability enforcer scope blindspot | QO-003, QO-007 | Update enforcer to include portal/ and platform/ roots |

---

## Trend

First audit — no prior baseline. All 25 findings are NEW. This run establishes the baseline for next comparison.

---

## Prioritised Actions

**Block deployment:**
1. Fix DEP-001 (protobufjs RCE) + escalate to TheGuardians

**This sprint (TheFixer):**
2. Upgrade Express across all projects (`npm audit fix`) — fixes DEP-004, DEP-005, DEP-006
3. Upgrade @grpc/grpc-js in portal/Backend — fixes DEP-007
4. Add `blocked_by` to shared types + remove `as any` casts — fixes QO-001
5. Create `portal/Backend/src/database/seed.ts` — fixes QO-002

**Next sprint (solo session for architecture items):**
6. Fix traceability enforcer to include portal/ and platform/ — fixes QO-003
7. Consolidate dual logger modules — fixes QO-005
8. Plan major-version upgrades (uuid, pino, React, OTel) — DEP-010–013

**Backlog:**
9. Document eslint suppressions or refactor — QO-006
10. Add automated test for FR-TMP-002 prompt guard — QO-007
11. Implement Dependabot or Snyk for ongoing CVE monitoring
12. Schedule dynamic-mode audit (bring services up)
