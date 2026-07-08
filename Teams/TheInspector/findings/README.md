# TheInspector Findings Directory

This directory receives audit reports and bug-backlogs from TheInspector audit runs post-merge.

## Latest Findings

### ⚠️ CRITICAL: Dependency Audit (2026-07-08)

**Grade: F** — 6 critical CVEs, 16 high-severity vulnerabilities  
**Action Required:** Apply Phase 1 patches within 24 hours

**Reports:**
- **[dependency-audit.md](./dependency-audit.md)** — Full detailed report with fix instructions
- **[dependency-audit-summary.json](./dependency-audit-summary.json)** — Structured data for dashboards

**Top Issues:**
1. Handlebars 4.0–4.7.8 (CVSS 9.8) — JavaScript injection
2. protobufjs (11 CVEs) — RCE + prototype pollution
3. Vitest (CVSS 9.8) — Arbitrary file read/execute
4. form-data (CVSS 7.5) — CRLF injection

**Escalated to:** TheGuardians (exploitable RCE/injection vectors)

---

## File Patterns

- **Audit reports**: `audit-YYYY-MM-DD-{grade}.html`
  - Example: `audit-2026-04-07-A.html`, `audit-2026-04-07-B-.html`
  - Grade can be: A, B+, B, B-, C+, C, C-, D, F
  - Contains detailed security, chaos, performance, and quality findings

- **Dependency Audit reports**: `dependency-audit*.{md,json}`
  - Markdown for detailed findings (vulnerability descriptions, CVE IDs, fix instructions)
  - JSON for structured dashboard integration

- **Bug backlogs**: `bug-backlog-YYYY-MM-DD.json`
  - Example: `bug-backlog-2026-04-07.json`
  - JSON structure with discovered bugs, severity levels, and remediation guidance

## .gitignore

HTML audit reports are large and not committed to git. The `.gitignore` in this directory excludes `*.html` files to keep the repository lean. Bug-backlog JSON files are tracked for record-keeping and trend analysis.

## Workflow

1. TheInspector team runs post-merge audits
2. Reports are generated and written to this directory
3. Bug backlog is updated with newly discovered issues
4. Team lead aggregates findings into sprint planning
5. Dependency auditor generates CVE/supply-chain findings (bi-weekly)

## Related Documentation

- **Learnings & watch list:** [../learnings/dependency-auditor.md](../learnings/dependency-auditor.md)
- **Inspector configuration:** [../inspector.config.yml](../inspector.config.yml)
