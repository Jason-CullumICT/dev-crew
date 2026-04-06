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

## Workflow

1. TheInspector team runs post-merge audits
2. Reports are generated and written to this directory
3. Bug backlog is updated with newly discovered issues
4. Team lead aggregates findings into sprint planning
