# TheInspector Health Report — 2026-08-28

**Grade: D** · Audit ID: `inspector-2026-08-28-8b48ac` · Branch: `audit/inspector-2026-08-28-8b48ac`

> **First audit — no baseline for trend comparison.**

---

## Grading

| Threshold | P1 Max | P2 Max | Min Coverage | Result |
|-----------|--------|--------|--------------|--------|
| A         | 0      | 3      | 80%          | ✗      |
| B         | 0      | 8      | 60%          | ✗      |
| C         | 2      | 15     | 40%          | ✗ (3 P1s) |
| **D**     | 999    | —      | —            | **✓ GRADE D** |

**Reason:** 3 P1 findings (exceeds C threshold of max_p1=2). Active-plan spec coverage: 100%. Canonical spec: ~0% traced.

---

## Summary

| Severity    | Count | Source                          |
|-------------|-------|---------------------------------|
| P1 Critical | 3     | 1 × quality-oracle, 2 × dependency-auditor |
| P2 High     | 12    | 3 × quality-oracle, 9 × dependency-auditor |
| P3 Medium   | 10    | 4 × quality-oracle, 6 × dependency-auditor (grouped) |
| P4 Low      | 6     | dependency-auditor              |
| **Escalated → TheGuardians** | **2** | DEP-001, DEP-002 (CVSS 9.8 each) |

**Specialists run:** quality-oracle (static), dependency-auditor (static)  
**Skipped:** performance-profiler, chaos-monkey — services offline (localhost:3001 not running)

---

## 🔴 Security Escalation → TheGuardians

Two CVSS 9.8 findings require TheGuardians review before next release:

### DEP-001 · Vitest UI Arbitrary File Read / RCE
- **CVE:** GHSA-5xrq-8626-4rwp · CWE-22, CWE-862
- **Affected:** `Source/Frontend@2.0.5`, `portal/Backend@1.2.2`, `portal/Frontend@3.2.5`
- **Risk:** Unauthenticated attacker with network access to a running `vitest --ui` server can read arbitrary files and execute code in the test-runner process.
- **Fix:** Upgrade vitest ≥3.2.6 in all three projects. Enforce `vitest run` (no --ui) in CI.

### DEP-002 · Protobufjs Arbitrary Code Execution
- **CVE:** GHSA-gx4f-cqfv-7h5q · CWE-94
- **Affected:** `platform/orchestrator`, `portal/Backend`
- **Risk:** Malicious `.proto` file triggers code execution inside the orchestrator process — full pipeline infrastructure compromise.
- **Fix:** Upgrade protobufjs ≥7.6.5. Audit `loadSync/load` call sites. Vendor all .proto files.

---

## P1 Findings

### QO-001 · Stale Canonical Spec — 77+ FRs Describe a Deprecated Platform
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** 93 unique FR IDs in the file; 0 traced in `Source/`. The codebase pivoted to a WorkItem/self-judging-workflow engine with no deprecation notice on the old spec. CLAUDE.md's "specs are source of truth" rule is enforced against a ghost document.
- **Fix:** Add `> **DEPRECATED** — superseded by Plans/self-judging-workflow` banner, then write `Specifications/self-judging-workflow.md` as canonical replacement.
- **Cross-refs:** QO-003 (enforcer gap), QO-004 (missing endpoint), QO-006 (missing seed)

---

## P2 Findings (12 total)

| ID       | Category               | Title                                                         | Routing       |
|----------|------------------------|---------------------------------------------------------------|---------------|
| QO-002   | architecture-violation | Route handlers bypass service layer — direct store imports   | TheFixer      |
| QO-003   | pattern-violation      | Traceability enforcer never checks Specifications/ — false green | TheFixer   |
| QO-004   | spec-drift             | `/api/search` not wired in app.ts — DependencyPicker returns 404 | TheFixer  |
| DEP-003  | dependency-vulnerability | OpenTelemetry crash on malformed /metrics request (GHSA-q7rr-3cgh-j5r3) | TheFixer |
| DEP-004  | dependency-vulnerability | Vite fs.deny bypass / path traversal on Windows (CVSS 7.5)  | TheFixer      |
| DEP-005  | dependency-vulnerability | Brace-expansion DoS — 4 CVEs via jest (CVSS 7.5)            | TheFixer      |
| DEP-006  | dependency-vulnerability | js-yaml CPU exhaustion — 3 CVEs (CVSS 7.5)                  | TheFixer      |
| DEP-007  | dependency-vulnerability | gRPC-JS crash — 2 CVEs (CVSS 7.5)                           | TheFixer      |
| DEP-008  | dependency-vulnerability | form-data CRLF injection (GHSA-hmw2-7cc7-3qxx)              | TheFixer      |
| DEP-009  | dependency-vulnerability | Nanoid infinite loop — 2 CVEs                                | TheFixer      |
| DEP-010  | dependency-vulnerability | WebSocket memory exhaustion — 2 CVEs (CVSS 7.5)             | TheFixer      |
| DEP-011  | dependency-vulnerability | path-to-regexp ReDoS (GHSA-37ch-88jc-xwx2)                  | TheFixer      |

---

## P3/P4 Findings (summary)

| ID              | Sev | Title                                                         |
|-----------------|-----|---------------------------------------------------------------|
| QO-005          | P3  | Duplicate test files — root tests/ lacks Verifies comments   |
| QO-006          | P3  | FR-dependency-seed not implemented — store always starts empty |
| QO-007          | P3  | 2× eslint-disable react-hooks/exhaustive-deps in production  |
| QO-008          | P3  | WorkItemDetailPage.tsx at 426 lines (threshold: 500)          |
| DEP-MOD-GROUP   | P3  | 31 moderate CVEs across 6 projects                           |
| DEP-OUTDATED    | P3  | 7 outdated major versions (express, react, react-router, uuid, dockerode, multer) |
| DEP-LOW-GROUP   | P4  | 6 low CVEs — monitor opportunistically                        |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| Canonical spec not updated on pivot | QO-001, QO-003, QO-004, QO-006 | Write `Specifications/self-judging-workflow.md`; extend enforcer to scan `Specifications/` |
| No route service abstraction | QO-002, QO-004 | Create `WorkItemService`; wire `/api/search` through it |
| No automated dep monitoring | All DEP-xxx | Dependabot + `npm audit` CI gate |

---

## Findings Not Raised (clean)

| Check | Result |
|-------|--------|
| Hardcoded secrets / credentials | ✅ None found |
| Empty catch blocks | ✅ None found |
| Skipped / todo tests | ✅ None found |
| `console.log` in production source | ✅ None found |
| Missing Verifies comments in production source | ✅ All production files carry `// Verifies:` |
| License compliance | ✅ PASSED — no GPL/AGPL |
| Abandoned / ownership-transferred packages | ✅ None detected |

---

## Recommendations

### 🔴 Block Deployment
1. **DEP-001:** Upgrade vitest ≥3.2.6 in all three projects. Enforce `vitest run` in CI.
2. **DEP-002:** Upgrade protobufjs ≥7.6.5. Audit `loadSync/load` call sites. Vendor .proto files.
3. Add `npm audit --audit-level=critical` as a hard CI gate.

### 🟠 This Sprint
4. **QO-001:** Deprecate `Specifications/dev-workflow-platform.md`; write canonical replacement.
5. **QO-002 + QO-004:** Create `WorkItemService`; refactor three routes; wire `/api/search`.
6. **QO-003:** Extend traceability enforcer to scan `Specifications/`.
7. **DEP-003 → DEP-007:** Upgrade vite, OpenTelemetry, jest deps, gRPC-js.

### 🟡 Next Sprint
8. **DEP-008 → DEP-011:** Upgrade form-data, nanoid, ws, path-to-regexp (via express 4.22.2+).
9. **QO-005:** Delete duplicate root-level test files.
10. **QO-006:** Implement `store/seed.ts` for dev/demo startup data.
11. **Infra:** Enable Dependabot across all 6 projects.

### ⬜ Backlog
12. **QO-007/QO-008:** Fix eslint-disable comments; split WorkItemDetailPage.tsx.
13. Plan React 19, express 5, uuid 11 upgrades.
14. Re-run TheInspector with services running to populate performance and chaos sections.

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-08-28-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-08-28.json` | Machine-readable bug backlog with all P1/P2/P3/P4 findings |
| `Teams/TheInspector/findings/AUDIT_REPORT_2026-08-28.md` | Detailed dependency audit report |
| `Teams/TheInspector/findings/audit-2026-08-28-summary.json` | Dependency audit machine summary |
