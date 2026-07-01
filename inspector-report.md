# TheInspector Audit Report — 2026-07-01

**Grade: D** · Audit ID: `run-20260701-064802` · Branch: `audit/inspector-2026-07-01-24b0cc`

## Grading

| Threshold | A | B | C | D |
|-----------|---|---|---|---|
| max_p1 | 0 | 0 | 2 | ∞ |
| max_p2 | 3 | 8 | 15 | ∞ |
| min_coverage | 80% | 60% | 40% | — |
| **This audit** | **4 P1** | **12 P2** | **27% full-spec** | **✓ D** |

4 P1 findings (threshold: C allows max 2) → Grade **D**

## Finding Counts

| Severity | Count | Source |
|----------|-------|--------|
| P1 Critical | 4 | QO-001 (quality-oracle) + DEP-001/002/003 (dependency-auditor) |
| P2 High | 12 | QO-002–006 + DEP-004–010 |
| P3 Medium | 12 | QO-007–010 + DEP-011–018 |
| P4 Low/Info | 4 | DEP-019–022 |
| **Total** | **32** | |

## Escalations → TheGuardians

3 findings meet the security escalation policy (injection / sensitive data exposed):

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| **DEP-001** | Handlebars JavaScript Injection (via @babel/core) | 9.8 | injection |
| **DEP-002** | Vitest UI arbitrary file read + execution | 9.8 | sensitive data exposed |
| **DEP-003** | Protobufjs RCE in orchestrator ⚠️ **BLOCKS WORK** | 9.8 | injection |

## Top 5 Findings

1. **[P1] DEP-003** — Protobufjs RCE (CVSS 9.8) in `platform/orchestrator` via `@grpc/grpc-js`. Blocks feature work. Fix: `npm update protobufjs` to 7.6.3+.
2. **[P1] DEP-002** — Vitest UI arbitrary file read (CVSS 9.8) in `Source/Frontend`. Fix: update to vitest@4.1.9+, remove `--ui` from CI.
3. **[P1] DEP-001** — Handlebars injection (CVSS 9.8) in build pipeline. Fix: `npm update @babel/core`.
4. **[P1] QO-001** — `GET /api/search` not registered in `app.ts`. DependencyPicker silently returns empty results — entire dependency search UI non-functional. Fix: wire route in app.ts (~30 min).
5. **[P2] QO-002** — Route handlers call store directly in 3 files (30+ call sites), violating CLAUDE.md architecture rule. Fix: extract workItemService.ts.

## Reports

| File | Description |
|------|-------------|
| [`Teams/TheInspector/findings/audit-2026-07-01-D.html`](Teams/TheInspector/findings/audit-2026-07-01-D.html) | Full HTML report (all 16 sections) |
| [`Teams/TheInspector/findings/bug-backlog-2026-07-01.json`](Teams/TheInspector/findings/bug-backlog-2026-07-01.json) | Machine-readable bug backlog + escalations array |
| [`Teams/TheInspector/findings/dependency-audit-2026-07-01.md`](Teams/TheInspector/findings/dependency-audit-2026-07-01.md) | Full dependency audit detail (545 lines) |

## Specialists

| Specialist | Mode | Status |
|-----------|------|--------|
| quality-oracle | Static | ✅ Complete |
| dependency-auditor | Static | ✅ Complete |
| performance-profiler | Static (services offline) | ⚠️ No runtime data |
| chaos-monkey | Static (services offline) | ⚠️ No fault injection |

## Next Actions

1. **Block deployment** — Fix DEP-001/002/003 (RCE CVEs) before any release
2. **This sprint** — Fix QO-001 (search route), QO-004 (enforcer scope), high-CVE dep updates
3. **Next sprint** — QO-002 service layer extraction, QO-003 enum fix, lock files
4. **Re-run with live services** to collect latency baselines and execute chaos scenarios
