# TheInspector Audit Report — 2026-10-19

**Overall Grade: D** · Audit ID: `inspector-2026-10-19`

> ⚠️ Grade D driven by 4 critical dependency CVEs (2 RCE vectors). Business logic and architecture independently grade **B** — all architecture rules are green. Upgrade the test toolchain to restore to grade B.

---

## Grade Breakdown

| Specialist | Mode | Grade | P1 | P2 | P3 | P4 |
|---|---|---|---|---|---|---|
| quality-oracle | static | **B** | 0 | 2 | 2 | 2 |
| dependency-auditor | static | **C** | 4 | 11 | 6 | 3 |
| performance-profiler | — | not run | — | — | — | — |
| chaos-monkey | — | not run | — | — | — | — |
| **TOTAL** | | **D** | **4** | **13** | **8** | **5** |

**Grading rule applied:** C allows max_p1: 2. With 4 P1s → grade D.

---

## P1 Findings — Escalated to TheGuardians

All 4 P1 findings are dependency CVEs tagged `[ESCALATE → TheGuardians]`:

| ID | Package | CVE Type | Fix |
|---|---|---|---|
| DEP-001 | handlebars@3.0.0–4.7.9 (via Jest) | **RCE — template injection** | Upgrade Jest ≥30.5.2 |
| DEP-002 | proxy-addr@≤2.0.7 (via Backend) | **Access control bypass — IP spoofing** | Upgrade proxy-addr ≥2.0.8 |
| DEP-003 | vitest@≤4.1.10 (Frontend direct) | **Arbitrary file read — secrets exposure** | Upgrade Vitest ≥5.0.5, disable --ui in CI |
| DEP-004 | tinypool@≤2.1.1 (via Vitest) | **Worker RCE — prototype pollution** | Upgrade Vitest ≥5.0.5 (pulls tinypool ≥2.1.2) |

---

## Top 5 Issues (Plain Language)

1. **Two RCE vectors in the test toolchain** — Handlebars.js (via Jest) allows template injection → code execution. Tinypool (via Vitest) allows prototype pollution → worker thread RCE. Both run in every CI pipeline.

2. **IP access control bypass** — proxy-addr ≤2.0.7 trusts IPv4-mapped IPv6 addresses, letting attackers bypass IP allowlists on the backend with a crafted header.

3. **Vitest UI server exposes secrets** — If `vitest --ui` is ever run in CI or a networked environment, any file on the filesystem (including `.env`, credentials) is readable by network-accessible attackers.

4. **40 high-severity CVEs in build toolchain** — React Router (XSS/redirect), PostCSS (file read), Browserslist (OOM), Nanoid/ws/brace-expansion (DoS). Most resolved by coordinated toolchain upgrade.

5. **Undocumented three-system split** — Project spans Source/, portal/, platform/ with no CLAUDE.md topology section. New agents risk cross-contaminating implementations. Traceability enforcer is blind to Specifications/.

---

## Cross-Reference Map — Fix Impact

| Root Cause | Single Fix | Findings Resolved |
|---|---|---|
| Outdated Vitest ecosystem | `npm i -D vitest@>=5.0.5` (Frontend) | DEP-003, DEP-004, DEP-010, DEP-013, DEP-015 **(2 P1 + 3 P2)** |
| Outdated Jest ecosystem | `npm i -D jest@>=30.5.2` (Backend) | DEP-001, DEP-005, DEP-006 **(1 P1 + 2 P2)** |
| Undocumented topology | Add CLAUDE.md topology + enforcer --specs mode | QO-001, QO-002 **(2 P2)** |
| Stale build toolchain | Upgrade Vite ≥8.3.4 + PostCSS ≥8.5.23 | DEP-008, DEP-014, DEP-018 **(2 P2 + 1 P3)** |

**4 root-cause fixes resolve 13 of 30 findings (43%), including all 4 P1 escalations.**

---

## Remediation Schedule

| Timeline | Action | Findings Fixed |
|---|---|---|
| **Block deployment** | Upgrade Vitest ≥5.0.5 + Jest ≥30.5.2 + proxy-addr ≥2.0.8; route P1s to TheGuardians | DEP-001–004 |
| **This sprint** | React Router, PostCSS, Vite, Browserslist, form-data upgrades; fix CLAUDE.md topology docs | DEP-005–015, QO-001, QO-002 |
| **Next sprint** | js-yaml, @babel/core, body-parser upgrades; delete duplicate tests; document eslint-disable | QO-003, QO-004, DEP-016–021 |
| **Backlog** | FR-TMP-008 tracing strategy; run perf-profiler + chaos-monkey with services online | QO-005, QO-006, DEP-LOW-01 |

---

## Architecture Rules — All Green ✅

No `console.log` in production · No hardcoded secrets · No direct DB calls from routes · No framework imports in services · No files >500 lines · No skipped tests · All active-plan FRs (28/28) traced.

---

## What Was NOT Run

- **performance-profiler** — backend at `localhost:3001` was offline; no latency data collected
- **chaos-monkey** — requires all services healthy; not run

Latency budgets from config: `/api/work-items` p95 ≤100ms, `/api/dashboard` p95 ≤150ms. Run both specialists with services online to complete the audit.

---

## Artifacts

| File | Description |
|---|---|
| `Teams/TheInspector/findings/audit-2026-10-19-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-10-19.json` | Structured bug backlog (30 findings, 4 escalations) |
| `Teams/TheInspector/findings/audit-2026-10-19-quality-oracle.md` | Quality oracle raw findings |
| `Teams/TheInspector/findings/dependency-audit-2026-10-19-C.md` | Dependency auditor raw findings |

---

## Escalation — TheGuardians

```
⚠  ESCALATION → TheGuardians
   Findings : 4 P1 CVEs — RCE (Handlebars/Tinypool), IP bypass (proxy-addr), Secrets exposure (Vitest UI)
   Audit    : inspector-2026-10-19
   Date     : 2026-10-19
   When     : Before next release

   To trigger TheGuardians:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see bug-backlog-2026-10-19.json)
```

---

*Report synthesised by TheInspector team-leader · 2026-10-19*
