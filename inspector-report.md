# TheInspector Audit Report — 2026-06-03

**Audit ID:** `run-20260603-070910`  
**Branch:** `audit/inspector-2026-06-03-8cf478`  
**Grade: D** ⬛ (3 P1 findings — exceeds C threshold of max_p1: 2)  
**Scope:** Full codebase, static mode (backend + frontend services were offline)  
**Trend:** First audit — no baseline

---

## Grade Derivation

| Threshold | Requires | Actual | Pass? |
|-----------|----------|--------|-------|
| A | P1=0, P2≤3, coverage≥80% | P1=3 | ❌ |
| B | P1=0, P2≤8, coverage≥60% | P1=3 | ❌ |
| C | P1≤2, P2≤15, coverage≥40% | P1=3 | ❌ |
| **D** | fallback | — | ✅ |

**Mitigating context:** One of the three P1s (DEP-002 Handlebars CVSS 9.8) is a dev-only transitive dependency with unverified production exposure — escalated to TheGuardians for confirmation. If runtime exposure is ruled out, P1 count drops to 2 and grade rises to **C**.

---

## Specialists

| Specialist | Mode | P1 | P2 | P3 | P4 | Grade |
|------------|------|----|----|----|----|-------|
| quality-oracle | static | 2 | 4 | 4 | 1 | C |
| dependency-auditor | static | 1 | 4 | 8 | 0 | B |
| performance-profiler | **not run** (service down) | — | — | — | — | — |
| chaos-monkey | **not run** (service down) | — | — | — | — | — |

---

## ⚠ Escalation — [ESCALATE → TheGuardians]

**Finding:** DEP-002 — Handlebars.js JavaScript Injection (CVSS 9.8)  
**Trigger:** `injection` matched in `config.escalation.security_triggers`  
**Package:** `handlebars@4.7.8` (transitive: `jest → ts-jest → handlebars`)  
**Risk:** Dev-only transitive dep. Production exposure **unverified** — TheGuardians must confirm no user-supplied Handlebars template rendering exists in `Source/Backend/src/` before next release.  
**Verify:** `grep -r "require.*handlebars\|import.*handlebars" Source/Backend/src/` (expect zero matches)  
**Fix (after TheGuardians clear):** `cd Source/Backend && npm update jest ts-jest`

```
⚠  ESCALATION → TheGuardians
   Finding : Handlebars.js JavaScript Injection (CVSS 9.8, CWE-94) — DEP-002
             Transitive: jest → ts-jest → handlebars@4.7.8 in Source/Backend
   Branch  : audit/inspector-2026-06-03-8cf478
   When    : before next release

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see below)
```

---

## P1 Findings

### QO-001 — Traceability Enforcer Blind to `portal/`
- **File:** `tools/traceability-enforcer.py:73`
- **Detail:** `source_dirs = ["Source", "E2E"]` — entire `portal/` app (FR-001..095+, FR-DUP-*, FR-dependency-*) is never scanned. CI reports 34 false-negative missing requirements. Real spec drift in the portal app is undetectable.
- **Fix:** Add `"portal"` to `source_dirs`. Tighten extraction regex (see QO-009 cross-ref). Route: TheFixer.

### QO-002 — FR-TMP-001..010 Has Zero Implementation
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 FRs (risk classification, Playwright E2E generation, auto-PR, AI review, auto-merge) — zero `// Verifies: FR-TMP-*` comments anywhere. No Plans/ entry.
- **Fix:** Either create `Plans/tiered-merge-pipeline/requirements.md` and schedule via TheATeam, OR archive to `Specifications/future/`. Decision required from team leader.

### DEP-002 — Handlebars.js JavaScript Injection (CVSS 9.8) [ESCALATED → TheGuardians]
- See escalation block above.

---

## P2 Findings Summary

| ID | Title | File | Route |
|----|-------|------|-------|
| QO-003 | `blocked_by` missing from PATCH input types; `as any` casts in DependencyPicker | `portal/Shared/api.ts:32,59` | TheFixer |
| QO-004 | DependencySection.test.tsx and BlockedBadge.test.tsx missing | `portal/Frontend/tests/` | TheFixer |
| QO-005 | FR-dependency-seed: no seed.ts, dependency UI empty on fresh install | `portal/Backend/src/database/` | TheFixer |
| QO-006 | `dependency_check_duration_seconds` histogram missing from metrics.ts | `Source/Backend/src/metrics.ts` | TheFixer |
| DEP-003 | qs@6.15.1 DoS on null array elements — CVSS 5.3 | Source/Backend (express transitive) | TheFixer |
| DEP-004 | brace-expansion ReDoS | Source/Backend (npm lifecycle) | TheFixer |
| DEP-005 | uuid@9.0.0 buffer overflow — CVSS 7.5 (LOW risk if v4-only — verify first) | Source/Backend | TheFixer |
| DEP-006 | vite@5.4.0 path traversal + CORS bypass — CVSS 5.3 | Source/Frontend | TheFixer |

**Shared fix for DEP-003/004/005:** `cd Source/Backend && npm update express uuid jest ts-jest && npm test`  
**Shared fix for DEP-006:** `cd Source/Frontend && npm update vite && npm test`

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|----------|-----------|
| Traceability enforcer scope/regex | QO-001, QO-009 | One commit: add `"portal"` to `source_dirs`, tighten regex |
| Incomplete dependency-linking plan | QO-003, QO-004, QO-005, QO-006 | One TheFixer cycle closes all 4 gaps |
| Source/Backend npm version lag | DEP-002, DEP-003, DEP-004, DEP-005 | `npm update express uuid jest ts-jest` |
| Source/Frontend toolchain lag | DEP-006 | `npm update vite` |

---

## P3/P4 Summary

| ID | Sev | Title |
|----|-----|-------|
| QO-007 | P3 | Empty catch blocks swallow errors — 3 portal/ locations (CLAUDE.md violation) |
| QO-008 | P3 | Duplicate test files for FR-WF-010/011 in Source/Frontend |
| QO-009 | P3 | Enforcer false positives on seed data IDs (covered by QO-001 fix) |
| QO-010 | P3 | 5 production files exceed 500-line threshold — split on next touch |
| DEP-P3s | P3 | 6 packages behind major versions (express, pino, uuid, react, react-dom, react-router-dom) |
| QO-011 | P4 | 3 eslint-disable suppressions without justification comments |

---

## Spec Coverage

| Domain | Coverage | Gap |
|--------|----------|-----|
| Self-judging workflow (FR-WF-*) | **100%** (13/13) | None |
| Dev-workflow-platform (FR-001..095+) | **~97%** (~92/95) | None (enforcer blind spot caveat) |
| Dependency linking (FR-dependency-*×16) | **81%** (13/16) | QO-003, QO-004, QO-005 |
| Tiered merge pipeline (FR-TMP-001..010) | **0%** (0/10) | QO-002 — never implemented |
| **Overall** | **~88%** (~118/134) | Inflated — enforcer blind to portal/ |

---

## Deliverables

| File | Contents |
|------|----------|
| `Teams/TheInspector/findings/audit-2026-06-03-D.html` | Full 16-section HTML report with risk matrix, charts, all findings |
| `Teams/TheInspector/findings/bug-backlog-2026-06-03.json` | Machine-readable backlog for TheFixer integration |
| `inspector-report.md` | This summary |

---

## Recommended Action Sequence

1. **Now:** Run TheGuardians escalation for DEP-002 (before next release)
2. **This sprint:** Fix QO-001+QO-009 (one commit, restores CI gate); make QO-002 scoping decision
3. **This sprint:** TheFixer cycle — close QO-003, QO-004, QO-005, QO-006 (dependency-linking completion)
4. **This sprint:** `npm update` passes in Source/Backend and Source/Frontend (closes DEP-003..006)
5. **Next sprint:** Fix QO-007 (empty catches), QO-008 (duplicate tests), add `npm audit` to CI
6. **Re-run TheInspector** after fixes to collect first latency baselines (services must be running) and verify grade improves to C or better

---

_Generated by TheInspector Team Leader · `run-20260603-070910` · 2026-06-03_
