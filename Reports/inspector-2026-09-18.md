# TheInspector Audit Report — 2026-09-18

**Grade: D** | Branch: `audit/inspector-2026-09-18-25fd15` | Run: `run-20260918-072513`

---

## Overall Grade: D 🔴

| Threshold | Criterion | Actual | Pass? |
|-----------|-----------|--------|-------|
| A | max P1=0, max P2=3, coverage≥80% | 5 P1, 28 P2, 96% | ❌ |
| B | max P1=0, max P2=8, coverage≥60% | 5 P1 | ❌ |
| C | max P1=2, max P2=15, coverage≥40% | 5 P1, 28 P2 | ❌ |
| **D** | **Anything worse than C** | **5 P1 — exceeds C's max of 2** | **✅ (D assigned)** |

---

## Summary

| Metric | Value |
|--------|-------|
| **P1 Critical** | 5 (1 QO + 4 DEP) |
| **P2 High** | 28 (4 QO + 24 DEP) |
| **P3 Moderate** | 23 (3 QO + 20 DEP) |
| **P4 Low** | 5 DEP |
| **Total CVEs** | 53 across 11 npm workspaces |
| **Spec Coverage** | 96% (27/28 active-plan FRs traced) |
| **Escalated → TheGuardians** | 5 findings |
| **Specialists Run** | quality-oracle (static), dependency-auditor (static) |
| **Specialists Skipped** | performance-profiler, chaos-monkey (services offline) |

---

## ⚠️ ESCALATION → TheGuardians

The following findings match security escalation triggers (injection, sensitive data exposed) and MUST be reviewed by TheGuardians before next production release:

| ID | Title | CVSS | Trigger |
|----|-------|------|---------|
| DEP-001 | Handlebars JS Injection via AST Type Confusion | 9.8 | injection |
| DEP-002 | Vitest UI Server Arbitrary File Read & Code Execution | 9.8 | injection |
| DEP-003 | Protobufjs Arbitrary Code Execution via Deserialization | 9.8 | injection |
| DEP-007 | form-data CRLF Injection (request smuggling) | 7.5 | injection |
| DEP-010-P1 | PostCSS Arbitrary File Read via sourceMappingURL | 7.5 | sensitive data exposed |

**To trigger TheGuardians:** Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

**Non-security findings → TheFixer backlog** (see `Teams/TheInspector/findings/bug-backlog-2026-09-18.json`)

---

## P1 Findings

### QO-001 — GET /api/search unregistered (DependencyPicker broken)
- **File:** `Source/Backend/src/app.ts`
- **Requirement:** `FR-dependency-search`
- **Impact:** User-visible feature failure. DependencyPicker returns 404 in production.
- **Fix:** Create `Source/Backend/src/routes/search.ts`, register in `app.ts`
- **Assign to:** TheFixer

### DEP-001 — Handlebars JavaScript Injection (CVSS 9.8) [ESCALATE → TheGuardians]
- **Package:** `handlebars < 4.7.9` (Source/Backend transitive)
- **CVE:** GHSA-2w6w-674q-4c4q
- **Fix:** `cd Source/Backend && npm update handlebars`

### DEP-002 — Vitest UI Server RCE (CVSS 9.8) [ESCALATE → TheGuardians]
- **Package:** `vitest 2.0.5` (Source/Frontend), `1.2.2` (portal/Backend) — both DIRECT
- **CVE:** GHSA-5xrq-8626-4rwp
- **Immediate:** Disable `--ui` flag in CI. **Fix:** `npm install vitest@^5.0.1`

### DEP-003 — Protobufjs RCE (CVSS 9.8) [ESCALATE → TheGuardians]
- **Package:** `protobufjs < 7.5.5` (platform/orchestrator, portal/Backend transitive via gRPC)
- **CVE:** GHSA-xq3m-2v4x-88gg (+ 12 secondary CVEs)
- **Fix:** `npm update protobufjs`

### DEP-010-P1 — PostCSS Arbitrary File Read (CVSS 7.5) [ESCALATE → TheGuardians]
- **Package:** `postcss <= 8.5.22` (Source/Frontend, Source/Backend)
- **CVE:** GHSA-6g55-p6wh-862q
- **Fix:** `npm update postcss (>= 8.5.23)`

---

## Cross-Reference Map (Root Cause → Multi-Finding Fix)

| XREF | Root Cause | Fixes | Single Fix |
|------|-----------|-------|-----------|
| XREF-1 | handlebars < 4.7.9 | DEP-001, DEP-004, DEP-016 | `npm update handlebars` in Source/Backend |
| XREF-2 | vitest < 5.0.1 (2 workspaces) | DEP-002 | `npm install vitest@^5.0.1` in 2 workspaces |
| XREF-3 | postcss <= 8.5.22 (2 workspaces) | DEP-010, DEP-010-P1 | `npm update postcss` |
| XREF-4 | FR-dependency-search not implemented | QO-001, QO-002 | Create + register search route |
| XREF-5 | Specs missing "Applies to:" + enforcer gap | QO-003, QO-004, QO-005 | Add headers + enumerate --plan targets |

---

## Deliverables

| Artifact | Path |
|----------|------|
| **HTML Report** | `Teams/TheInspector/findings/audit-2026-09-18-D.html` |
| **Bug Backlog JSON** | `Teams/TheInspector/findings/bug-backlog-2026-09-18.json` |
| **Dependency Audit** | `Teams/TheInspector/findings/dependency-audit-2026-09-18.md` |
| **Quality Oracle Findings** | `Teams/TheInspector/findings/audit-2026-09-18-quality-oracle.md` |

---

## Recommended Actions

**Block deployment:**
1. Disable Vitest UI server in all CI configs immediately
2. Upgrade vitest ≥ 5.0.1 in Source/Frontend and portal/Backend
3. Upgrade handlebars ≥ 4.7.9 in Source/Backend
4. Upgrade protobufjs ≥ 7.5.5 in platform/orchestrator and portal/Backend
5. Trigger TheGuardians security audit

**This sprint:**
1. Implement `GET /api/search` route (QO-001)
2. Add `dependencyCheckDuration` histogram to Source/Backend metrics (QO-002)
3. Patch all 8 P2 CVEs listed above
4. Fix traceability enforcer gap (QO-004) — add `--plan` targets to CLAUDE.md
5. Add "Applies to:" headers to all 3 domain specs (QO-003)
6. Add `npm audit --audit-level=moderate` to CI pipeline

**Next sprint:**
1. Fix hardcoded Playwright cycle directory (QO-006)
2. Merge duplicate test files (QO-007)
3. Document eslint suppressions (QO-008)
4. Trace or document FR-TMP-001–010 (QO-005)
5. Patch P3 CVEs and reduce portal/Backend dependency bloat
6. Bring services online → run performance-profiler + chaos-monkey in dynamic mode

---

*Generated by TheInspector team-leader · Run: run-20260918-072513 · 2026-09-18*
