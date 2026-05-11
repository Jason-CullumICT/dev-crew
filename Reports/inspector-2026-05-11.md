# TheInspector — Audit Report
**Date:** 2026-05-11 | **Audit ID:** `run-20260511-061200`
**Branch:** `audit/inspector-2026-05-11-5b5cb6`
**Scope:** Full codebase — static analysis only (services offline)

---

## Overall Grade: C ⚠️

> **Release Gate: ⛔ BLOCKED** — 2 P1 CVEs (RCE/ACE) must be resolved before deployment.

| Severity | Count | Route |
|----------|-------|-------|
| P1 | 2 | → TheGuardians (security escalation) |
| P2 | 4 | → TheFixer |
| P3 | 9 | → TheFixer / backlog |
| P4 | 2 | → backlog |
| **Total** | **17** | |

**Spec Coverage:** 96% (116/121 requirements) · **Dynamic Tests:** 0 (services offline)

---

## Grading Rationale

Config thresholds (`inspector.config.yml`):
- **A:** max_p1=0, max_p2=3, min_coverage=80% → ❌ FAIL (P1=2)
- **B:** max_p1=0, max_p2=8, min_coverage=60% → ❌ FAIL (P1=2)
- **C:** max_p1=2, max_p2=15, min_coverage=40% → ✅ PASS (P1=2, P2=4, coverage=96%)

---

## Specialists

| Specialist | Mode | Grade | P1 | P2 | P3 | P4 |
|------------|------|-------|----|----|----|----|
| quality-oracle | static | A | 0 | 1 | 5 | 2 |
| dependency-auditor | static | C | 2 | 3 | 4 | 0 |
| performance-profiler | **SKIPPED** — backend offline | — | — | — | — | — |
| chaos-monkey | **SKIPPED** — all services offline | — | — | — | — | — |

---

## Security Escalations → TheGuardians

Both P1 findings are exploitable CVEs that require red-team assessment before patching.

### DA-P1-001 — handlebars@4.7.8 RCE `[ESCALATE → TheGuardians]`
- **CVE:** GHSA-2w6w-674q-4c4q
- **Affected:** `Source/Backend`
- **Risk:** JavaScript template injection → arbitrary code execution on the backend server
- **Fix:** `npm install handlebars@latest --prefix Source/Backend`

### DA-P1-002 — protobufjs@7.5.4 ACE `[ESCALATE → TheGuardians]`
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected:** `platform/orchestrator`, `portal/Backend`
- **Risk:** Crafted protobuf payload → arbitrary code execution in orchestrator (full pipeline control)
- **Fix:** `npm update protobufjs --prefix platform/orchestrator && npm update protobufjs --prefix portal/Backend`

**Escalation path (no PR detected — offline):**
```
Read Teams/TheGuardians/team-leader.md and follow it exactly.
Target: ephemeral isolated environment (required).
Finding: handlebars RCE (Source/Backend) + protobufjs ACE (orchestrator + portal/Backend)
```

---

## P2 Findings → TheFixer

| ID | Title | File | Fix |
|----|-------|------|-----|
| QO-P2-001 | 51 direct `getDb()` calls in 9 route handlers — service layer bypassed | `portal/Backend/src/routes/*.ts` | Refactor SQL into service layer; priority: cycles → pipelines → teamDispatches |
| DA-P2-001 | path-to-regexp ReDoS (GHSA-37ch-88jc-xwx2) — zero-auth DoS on orchestrator routes | `platform/orchestrator/package.json` | `npm update path-to-regexp --prefix platform/orchestrator` |
| DA-P2-002 | picomatch ReDoS in glob matching | `portal/Frontend/package.json` | `npm update picomatch --prefix portal/Frontend` |
| DA-P2-003 | vite / vitest / esbuild multiple CVEs — build chain risk | `Source/Frontend`, `portal/Frontend` | `npm update vite vitest esbuild` in both projects |

---

## P3 Findings

| ID | Category | Title |
|----|----------|-------|
| QO-P3-001 | Spec Drift | `blocked_by` field missing from `UpdateBugInput` / `UpdateFeatureRequestInput` in `portal/Shared/api.ts` |
| QO-P3-002 | Spec Drift | `portal/Backend/src/database/seed.ts` absent — dependency relationships never seeded |
| QO-P3-003 | Untested Req | `DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist |
| QO-P3-004 | Spec Drift | `platform/Dockerfile.worker` has no `# Verifies: FR-TMP-008` comment |
| QO-P3-005 | Spec Drift | Portal detail route handlers missing `// Verifies: FR-DUP-06` |
| DA-P3-001 | Outdated Dep | uuid 9.0.0 → 14.0.0 (5 majors) |
| DA-P3-002 | Outdated Dep | pino 8.x → 10.3.1 (2 majors) |
| DA-P3-003 | Outdated Dep | express 4.x → 5.x |
| DA-P3-004 | Outdated Dep | react 18.x → 19.x |

---

## P4 Findings

| ID | Title |
|----|-------|
| QO-P4-001 | `eslint-disable react-hooks/exhaustive-deps` in 2 production files (`DependencyPicker.tsx:82`, `useWorkItems.ts:63`) |
| QO-P4-002 | Duplicate logger in `Source/Backend` — `logger.ts` re-exports `utils/logger.ts`; consolidate |

---

## Cross-Reference Map

| Root Cause | Findings | Fix Impact |
|------------|----------|------------|
| Unpatched npm packages | DA-P1-001, DA-P1-002, DA-P2-001, DA-P2-002, DA-P2-003 | One sprint of `npm audit fix` resolves 5 findings and clears the release blocker |
| Service layer bypass in portal/ | QO-P2-001 | Refactor 9 route files → eliminates architecture violation |
| Incomplete dependency-linking plan | QO-P3-001, QO-P3-002, QO-P3-003 | 3 targeted code additions close all dependency-linking spec gaps |

---

## Trend

**First Inspector synthesis** — no prior grade for comparison.
Quality Oracle baseline: 96% spec coverage (116/121).
Dependency auditor CVE baseline: 3 critical, 3 high, 17 moderate.

To upgrade from C → B on next audit:
1. Clear both P1 CVEs
2. Fix path-to-regexp ReDoS (DA-P2-001)
3. Services must be online for performance-profiler and chaos-monkey

---

## Recommendations

| Priority | Action |
|----------|--------|
| ⛔ Block deployment | Escalate to TheGuardians + patch handlebars and protobufjs |
| This sprint | Fix QO-P2-001 (route layer), DA-P2-001 (path-to-regexp), DA-P2-003 (build tools) |
| Next sprint | Complete dependency-linking plan (P3-001/002/003), add missing Verifies comments |
| Backlog | Plan major-version upgrades (uuid, pino, express, react); fix eslint-disable |

---

## Output Files

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-05-11-C.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-05-11.json` | Structured bug backlog (all findings + escalations array) |
| `inspector-report.md` | This summary |
