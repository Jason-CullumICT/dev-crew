# TheInspector Health Report — 2026-08-02

**Audit ID:** `run-20260802-054055`
**Branch:** `audit/inspector-2026-08-02-4fcc3a`
**Overall Grade: D** — 5 P1 findings, 12 P2 findings
**First audit — no prior baseline.**

---

## Grade Rationale

| Threshold | Criteria | Actual | Result |
|-----------|----------|--------|--------|
| A | max_p1=0, max_p2=3, spec≥80% | P1=5, P2=12 | ❌ |
| B | max_p1=0, max_p2=8, spec≥60% | P1=5 | ❌ |
| C | max_p1=2, max_p2=15, spec≥40% | P1=5 | ❌ |
| **D** | anything worse than C | **P1=5 > max 2** | ✅ |

---

## ⚠ Escalation → TheGuardians

3 CRITICAL injection/RCE CVEs found. Must be reviewed by TheGuardians before next release.

| ID | CVE | CVSS | Package | Impact |
|----|-----|------|---------|--------|
| DEP-001 | GHSA-5xrq-8626-4rwp | 9.8 | vitest@≤2.0.5 | RCE via dev UI server |
| DEP-002 | GHSA-2w6w-674q-4c4q | 8.1 | handlebars@4.0–4.7.8 | JS injection via template |
| DEP-003 | GHSA-mpfx-v98g-m65m | 9.1 | protobufjs@≤7.6.4 | RCE via schema injection |

**To trigger TheGuardians:** Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## Specialists

| Specialist | Mode | Grade | P1 | P2 | P3 |
|------------|------|-------|----|----|----|
| quality-oracle | static | C | 2 | 4 | 4 |
| dependency-auditor | static | D | 3 | 8 | 7 |
| performance-profiler | **skipped** (services offline) | — | — | — | — |
| chaos-monkey | **skipped** (services offline) | — | — | — | — |

---

## P1 Findings (5)

| ID | Title | Source | Escalate |
|----|-------|--------|----------|
| QO-001 | Traceability enforcer blind spot — portal/ and platform/ excluded (83/97 FRs invisible) | quality-oracle | TheFixer (solo session) |
| QO-002 | workflow-engine.md has no FR-XXX IDs — unenforceable spec | quality-oracle | TheFixer (requirements-reviewer) |
| DEP-001 | Vitest RCE CVSS 9.8 — arbitrary file read/execute via UI server | dependency-auditor | **TheGuardians** |
| DEP-002 | Handlebars JS injection CVSS 8.1 — AST type confusion | dependency-auditor | **TheGuardians** |
| DEP-003 | Protobufjs RCE CVSS 9.1 — schema injection in orchestrator | dependency-auditor | **TheGuardians** |

---

## P2 Findings (12)

| ID | Title | Route |
|----|-------|-------|
| QO-003 | Route handlers bypass service layer (workItems.ts, intake.ts, workflow.ts) | TheFixer backend-coder |
| QO-004 | portal/Shared/api.ts missing `blocked_by` on update types — `as any` casts in DependencyPicker | TheFixer api-contract |
| QO-005 | portal/Backend/src/database/seed.ts absent — FR-dependency-seed unimplemented | TheFixer backend-coder |
| QO-006 | Source/Backend logger always emits JSON — no dev pretty-print, two logger entry points | TheFixer backend-coder |
| DEP-004 | Express DoS via qs — affects Backend + Frontend + Orchestrator | TheFixer (all modules) |
| DEP-005 | Vite path traversal + Windows fs.deny bypass — CVSS 7.5 | TheFixer frontend-coder |
| DEP-006 | Brace-expansion DoS — 3 CVEs, OOM + process hang | TheFixer backend-coder |
| DEP-007 | Form-data CRLF injection — affects 3 modules | TheFixer |
| DEP-008 | PostCSS XSS + arbitrary file read — 3 CVEs | TheFixer frontend-coder |
| DEP-009 | React Router DOM vulnerability | TheFixer frontend-coder |
| DEP-010 | WebSocket memory exhaustion DoS — CVSS 7.5 | TheFixer frontend-coder |
| DEP-011 | gRPC malformed request crash — orchestrator | TheFixer (solo session) |

---

## Cross-Reference Map (single fix → multiple findings)

| Root Cause | Findings Resolved | Fix |
|------------|-------------------|-----|
| protobufjs ≤7.6.4 | DEP-003, DEP-015, DEP-017 | `npm install protobufjs@>=7.7.0` |
| Enforcer scans only Source/+E2E/ | QO-001, QO-010 | Extend source_dirs in enforcer |
| express ≤4.22.1 (3 modules) | DEP-004, DEP-013 | `npm install express@>=4.22.2` |
| No WorkItem service layer | QO-003 | Create workItemService.ts |
| vite ≤6.4.2 | DEP-005, DEP-018 | `npm install vite@>=8.2.0` |

---

## Spec Coverage

| Spec | FRs | Enforcer-Visible | Actual |
|------|-----|-----------------|--------|
| dev-workflow-platform | 74 | 0% (portal/ not scanned) | ~100% |
| self-judging-workflow | 13 | 100% | 100% |
| tiered-merge-pipeline | 10 | 0% (platform/ not scanned) | 90% |
| workflow-engine | 0 FR IDs | N/A | N/A |

**Overall enforcer-visible: 13% / Actual: ~99%**

---

## Recommendations

**Block deployment:**
- Patch vitest (DEP-001), protobufjs (DEP-003), handlebars (DEP-002) — critical RCE/injection
- Update express to ≥4.22.2 across all modules (DEP-004)

**This sprint:**
- DEP-005–DEP-011 (high CVEs), QO-003 (service layer)

**Next sprint:**
- QO-001, QO-002 (tooling), QO-004, QO-005, QO-006 (spec deltas + logger)

**Backlog:**
- P3 CVE sweeps, eslint fixes, api/client.ts split, FR-TMP-008 tag

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-08-02-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-08-02.json` | Structured bug backlog with all findings |
| `Teams/TheInspector/findings/dep-audit-2026-08-02.json` | Dependency audit structured data (from dependency-auditor) |
| `Teams/TheInspector/findings/audit-2026-08-02-D.md` | Dependency audit detailed markdown (from dependency-auditor) |

**Next audit:** 2026-08-16 (bi-weekly cadence)
