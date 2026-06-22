# TheInspector Audit Report — 2026-06-22

**Grade: D** | Branch: `audit/inspector-2026-06-22-b71a77` | Run: `run-20260622-074112`

## Summary

| Severity | Count | Escalated |
|----------|-------|-----------|
| P1 Critical | 3 | 3 → TheGuardians |
| P2 High | 12 | 0 (→ TheFixer) |
| P3 Medium | 14 | — |
| P4 Low | 27 | — |

**Grading rationale:** 3 P1 findings exceed the C-threshold (max_p1: 2). Grade D per `inspector.config.yml`.

Specialists run: **quality-oracle** (static) · **dependency-auditor** (static)
Not dispatched: performance-profiler · chaos-monkey (services offline)

---

## Escalations → TheGuardians

Three findings trigger security escalation per `config.escalation.security_triggers`:

| ID | CVE | Trigger | Title |
|----|-----|---------|-------|
| DEP-006 | GHSA-5xrq-8626-4rwp (CVSS 9.8) | sensitive data exposed | Vitest UI Arbitrary File Read & Code Execution |
| DEP-001 | GHSA-2w6w-674q-4c4q (CVSS 9.8) | injection | Handlebars Template Injection / RCE |
| DEP-012 | GHSA-xq3m-2v4x-88gg (CVSS 9.8) | injection | Protobufjs ACE in Production Orchestrator |

---

## Full Report

HTML report: `Teams/TheInspector/findings/audit-2026-06-22-D.html`
Bug backlog: `Teams/TheInspector/findings/bug-backlog-2026-06-22.json`

---

## Top 5 Action Items

1. **[Block deployment]** Upgrade `vitest@^4.1.9` in `Source/Frontend/` — CVSS 9.8, network-accessible file read (DEP-006)
2. **[Block deployment]** Upgrade `dockerode` + pin `protobufjs@^7.7.0` in `platform/orchestrator/` — prod orchestrator ACE (DEP-012)
3. **[Block deployment]** Pin `handlebars@^4.7.9` in `Source/Backend/` — RCE in CI test stack (DEP-001)
4. **[This sprint]** Add `"portal"` to `source_dirs` in `tools/traceability-enforcer.py:69` — enforcer blind to 95+ requirements, 7/8 plans fail (QO-001)
5. **[This sprint]** TheFixer: implement 3 open FR-dependency-* items — `blocked_by` types, `seed.ts`, 2 missing test files (QO-002/003/004)
