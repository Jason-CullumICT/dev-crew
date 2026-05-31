# TheInspector Findings Directory

This directory receives audit reports and bug-backlogs from TheInspector audit runs post-merge.

## File Patterns

- **Audit reports**: `audit-YYYY-MM-DD-{grade}.html`
  - Example: `audit-2026-04-07-A.html`, `audit-2026-04-07-B-.html`
  - Grade can be: A, B+, B, B-, C+, C, C-, D, F
  - Contains detailed security, chaos, performance, and quality findings

- **Bug backlogs**: `bug-backlog-YYYY-MM-DD.json`
  - Example: `bug-backlog-2026-04-07.json`
  - JSON structure with discovered bugs, severity levels, and remediation guidance

## .gitignore

HTML audit reports are large and not committed to git. The `.gitignore` in this directory excludes `*.html` files to keep the repository lean. Bug-backlog JSON files are tracked for record-keeping and trend analysis.

## Dependency Audit Reports

New format (dependency auditor):
- **Markdown report**: `dependency-audit-YYYY-MM-DD.md` — Human-readable findings with detailed analysis
- **JSON summary**: `dependency-audit-YYYY-MM-DD.json` — Machine-readable format for dashboards
- **Executive summary**: `AUDIT_SUMMARY.txt` — High-level overview for quick review

These reports contain:
- CVE severity classification (P1 critical, P2 high, P3 moderate, P4 low)
- Workspace-by-workspace breakdown
- Supply chain risk analysis
- License compliance assessment
- Outdated major version tracking
- Remediation recommendations with priority phases

## Workflow

1. TheInspector team runs post-merge audits
2. Reports are generated and written to this directory
3. Bug backlog is updated with newly discovered issues
4. Dependency audits run monthly and generate remediation plans
5. Team lead aggregates findings into sprint planning
