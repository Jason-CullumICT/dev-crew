# TheInspector Findings Directory

This directory receives audit reports and bug-backlogs from TheInspector audit runs post-merge.

## Latest Audit: 2026-06-12 — Full Health Audit

**Overall Grade: D** · Audit ID: `run-20260612-065801`  
3 × P1 (CVSS 9.8) · 7 × P2 · 3 × P3 · 1 × P4 · 14 total findings  
Specialists: quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭ · chaos-monkey ⏭

### Reports Available

| Report | Format | Purpose |
|--------|--------|---------|
| [`audit-20260612-D.html`](audit-20260612-D.html) | HTML | **Full 16-section health report** — grade, all findings, risk matrix, spec coverage, recommendations |
| [`bug-backlog-20260612.json`](bug-backlog-20260612.json) | JSON | Machine-readable bug backlog — escalations array + P1–P4 findings |
| [`dependency-audit-20260612.md`](dependency-audit-20260612.md) | Markdown | Dependency specialist detail report |
| [`dependency-audit-summary-20260612.json`](dependency-audit-summary-20260612.json) | JSON | Dependency metrics dashboard data |
| [`vulnerability-detail-20260612.json`](vulnerability-detail-20260612.json) | JSON | Per-package CVE details (CVSS, CWE, attack vectors) |

### ⚠ Security Escalations → TheGuardians (3 findings)

1. **DEP-001 — protobufjs RCE** (CVSS 9.8) — Arbitrary code execution
   - Affects: `platform/orchestrator`, `portal/Backend`
   - Fix: `npm update protobufjs` · **[ESCALATE → TheGuardians]**

2. **DEP-002 — Handlebars Template Injection** (CVSS 9.8) — Conditional RCE
   - Affects: `Source/Backend`
   - Fix: `npm update handlebars`; audit call sites · **[ESCALATE → TheGuardians]**

3. **DEP-003 — Vitest UI Server RCE** (CVSS 9.8) — File read + code execution
   - Affects: `Source/Frontend`, `portal/Frontend`
   - Fix: `npm update vitest`; enforce no `--ui` in CI · **[ESCALATE → TheGuardians]**

### Top P2 Findings → TheFixer

- **QO-001**: `GET /api/search` unregistered — DependencyPicker broken at runtime
- **QO-003**: Route handlers bypass service layer (3 route files)
- **DEP-004/005**: gRPC DoS + path-to-regexp ReDoS in platform infra

See `audit-20260612-D.html` for full prioritised remediation plan.

---

## File Patterns

- **Dependency audits**: `dependency-audit-YYYY-MM-DD.md`
  - Markdown report with detailed findings
  - Workspace breakdown, vulnerability analysis, remediation roadmap

- **Audit summaries**: `dependency-audit-summary-YYYY-MM-DD.json`
  - Machine-readable JSON for dashboard integration
  - Metrics, severity counts, escalation routes

- **Vulnerability details**: `vulnerability-detail-YYYY-MM-DD.json`
  - Per-package CVE information
  - CVSS scores, CWE classifications, attack scenarios

- **Security audits**: `audit-YYYY-MM-DD-{grade}.html`
  - Example: `audit-2026-04-07-A.html`
  - Grade can be: A, B+, B, B-, C+, C, C-, D, F
  - Contains security, chaos, performance, and quality findings

- **Bug backlogs**: `bug-backlog-YYYY-MM-DD.json`
  - Example: `bug-backlog-2026-04-07.json`
  - Discovered bugs, severity levels, remediation guidance

## .gitignore

- HTML audit reports are large and excluded to keep the repository lean
- JSON reports (dependency audits, bug backlogs, vulnerability details) are tracked for record-keeping and trend analysis

## Workflow

1. TheInspector team runs specialized audits (dependency, security, performance, quality)
2. Reports are generated and written to this directory
3. Team lead aggregates findings into sprint planning
4. TheGuardians/TheFixer coordinate on remediation
5. Next audit scheduled after remediation phase completes
