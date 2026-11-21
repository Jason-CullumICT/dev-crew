# TheInspector Audit Report — 2026-11-21

**Grade: D** · Audit ID: `run-20261121-093831` · Branch: `audit/inspector-2026-11-21-29f7b6`

---

## ⚠️ ESCALATION → TheGuardians

**4 P1 security findings require TheGuardians review before next release:**

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| DEP-001 | Handlebars JavaScript Injection RCE (AST Type Confusion) | 9.8 | injection |
| DEP-002 | proxy-addr IPv4-Mapped IPv6 Spoofing — Auth Bypass | 9.1 | auth bypass |
| DEP-003 | Vitest UI Server Arbitrary File Read + RCE (dev env) | 9.8 | injection |
| DEP-004 | Protobufjs Arbitrary Code Execution via crafted .proto | 9.8 | injection |

**Action:** Read `Teams/TheGuardians/team-leader.md` and trigger a security audit. Target: ephemeral isolated environment (required).

---

## Grading

| Threshold | A | B | C | D (assigned) |
|-----------|---|---|---|---|
| max P1 | 0 | 0 | 2 | **6** ← |
| max P2 | 3 | 8 | 15 | **17** ← |
| min Spec Coverage | 80% | 60% | 40% | 100% active / 9% all |

6 P1 findings and 17 P2 findings exceed the C threshold (max P1=2, max P2=15). **Grade: D**.

---

## Totals

| Severity | Count | Source |
|----------|-------|--------|
| P1 Critical | **6** | 4 × DEP (escalate) + 2 × QO |
| P2 High | **17** | 13 × DEP + 4 × QO |
| P3 Medium | **16** | 15 × DEP + 1 × QO |
| P4 Low | **5** | DEP |
| **Total** | **44** | |
| Escalations → TheGuardians | **4** | DEP-001–004 |
| Routed → TheFixer | **13 P1/P2** | QO-001–006, DEP-005–013 |

---

## Specialists Run

| Specialist | Mode | Status |
|------------|------|--------|
| quality-oracle | Static | ✅ Complete |
| dependency-auditor | Static | ✅ Complete |
| performance-profiler | — | ⏭️ Skipped (backend offline) |
| chaos-monkey | — | ⏭️ Skipped (services offline) |

---

## P1 Findings

### DEP-001 · P1 · `[ESCALATE → TheGuardians]`
**Handlebars JavaScript Injection via AST Type Confusion (CVSS 9.8)**
- Packages: `handlebars 4.0.0–4.7.9` (Backend + Frontend)
- CVEs: GHSA-2w6w-674q-4c4q, GHSA-8r5x-fm3f-whwj + 8 related
- Exploit: Attacker crafts Handlebars template payload → arbitrary JS executes on server
- Fix: `npm update handlebars` to >= 4.7.10 or replace with logic-less template engine

### DEP-002 · P1 · `[ESCALATE → TheGuardians]`
**proxy-addr IPv4-Mapped IPv6 Spoofing — Auth Bypass (CVSS 9.1)**
- Packages: `proxy-addr 1.1.0–2.0.7` (Backend + Orchestrator)
- CVE: GHSA-jqcg-44mw-7w3h
- Exploit: `::ffff:127.0.0.1` in X-Forwarded-For bypasses IP whitelist in Express trust-proxy
- Fix: `npm update proxy-addr` to >= 2.0.8

### DEP-003 · P1 · `[ESCALATE → TheGuardians]`
**Vitest UI Server Arbitrary File Read + RCE — Dev Environment (CVSS 9.8)**
- Packages: `vitest < 3.2.6`, `tinypool <= 2.1.1`, `@vitest/mocker`
- CVEs: GHSA-5xrq-8626-4rwp, GHSA-5gmw-xhrv-c9v3, GHSA-82fw-gwwq-j7x9
- Exploit: Path traversal + tinypool prototype pollution → RCE in CI/dev
- Fix: `npm update vitest` to >= 5.1.1 (major version bump)

### DEP-004 · P1 · `[ESCALATE → TheGuardians]`
**Protobufjs Arbitrary Code Execution via Crafted .proto Files (CVSS 9.8)**
- Packages: `protobufjs <= 7.6.4` (platform/orchestrator)
- CVEs: GHSA-xq3m-2v4x-88gg, GHSA-75px-5xx7-5xc7
- Exploit: Crafted gRPC messages → prototype pollution → code generation gadget → RCE in orchestrator
- Fix: `npm update protobufjs` to >= 7.6.5

### QO-001 · P1
**Traceability enforcer has single-plan scope — 7/8 plans silently pass the CI gate**
- File: `tools/traceability-enforcer.py`
- Exploit: Developer adds code with zero traceability; enforcer auto-picks `self-judging-workflow` and returns green
- Fix: Create `tools/traceability-enforcer-all.sh`; update CLAUDE.md gate

### QO-002 · P1
**Route handlers directly call in-memory store — service layer bypassed**
- Files: `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:44`, `intake.ts:19`
- Exploit: Any invariant added to `workItemService.ts` is dead code; state machine guards can be bypassed
- Fix: Create `Source/Backend/src/services/workItemService.ts`; route all CRUD through it

---

## P2 Summary

| ID | Title | Fix |
|----|-------|-----|
| QO-003 | 10 FR-TMP-* unimplemented, no plan file | Create `Plans/tiered-merge-pipeline/` stub |
| QO-004 | 7 stale plans describe replaced system | Archive to `Plans/_archived/` |
| QO-005 | Placeholder FR-XXX IDs in requirements files | Replace with real IDs |
| QO-006 | Duplicate test files inflate coverage metrics | Remove root-level dupes, keep `tests/pages/` |
| DEP-005 | body-parser DoS (CVSS 7.5) | `npm update body-parser` |
| DEP-006 | brace-expansion DoS (7 CVEs) | `npm update` |
| DEP-007 | browserslist DoS + prototype pollution | `npm update browserslist` |
| DEP-008 | form-data CRLF injection (CVSS 7.5) | `npm update form-data` to >= 4.0.6 |
| DEP-009 | js-yaml DoS via merge-key chains | `npm update js-yaml` |
| DEP-010 | qs DoS + array limit bypass | `npm update` via express |
| DEP-011 | vite path traversal + command exec | `npm update vite` to >= 6.5.0 |
| DEP-012 | react-router open redirect / XSS (4 CVEs) | `npm update react-router-dom` to >= 7.18.0 |
| DEP-013 | uuid buffer overflow (direct dep) | `npm update uuid` |

---

## Prioritised Actions

**🚨 Block Deployment:**
1. Escalate DEP-001–004 to TheGuardians; patch after security review
2. Create `services/workItemService.ts`; route all persistence through it (QO-002)

**🔥 This Sprint:**
3. Fix traceability gate: `tools/traceability-enforcer-all.sh` (QO-001)
4. `npm update` across all 3 package.json files for P2 CVEs (DEP-005–013)
5. Remove duplicate test files (QO-006)

**📌 Next Sprint:**
6. Archive 7 stale plans + create tiered-merge-pipeline stub (QO-003/004/005)
7. Remove ESLint suppressions in `useWorkItems.ts` + `DependencyPicker.tsx` (QO-007)
8. Plan major version upgrades: React → v19, Express → v5, React Router → v7.18+

**📋 Backlog:**
9. Schedule dynamic audit with services live (latency baselines + chaos tests)
10. Add pagination to `GET /api/work-items` (unbounded list exfiltration risk)
11. DEP-P4 CVEs (5 low-severity) — routine maintenance

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|----------|-----------|
| npm dependency staleness | DEP-001→013 (all 17 dep CVEs) | `npm update` all 3 package.json files |
| Verification tooling inadequacy | QO-001 + QO-005 | `tools/traceability-enforcer-all.sh` + replace placeholder IDs |
| Missing service layer | QO-002 + (chaos scenarios deferred) | Create `workItemService.ts` |
| Two-era stale spec debt | QO-003 + QO-004 + QO-005 | Archive 7 stale plans + create TMP plan stub |

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-11-21-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-11-21.json` | Structured JSON backlog (escalations + P1/P2 findings) |
| `inspector-report.md` | This summary |

---

## Spec Coverage

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| Active plan (self-judging-workflow) | 13 | 13 | **100%** ✅ |
| All 8 plans | ~150 | ~13 | **~9%** ⚠️ |
| tiered-merge-pipeline.md | 10 | 0 | **0%** ❌ |

> The ~9% is misleading — 7/8 plans describe a replaced system. The current system is at 100%. Archive the stale plans first.

---

_Generated by TheInspector · team_leader (claude-sonnet-4-6) · 2026-11-21 · run-20261121-093831_
