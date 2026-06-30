# TheInspector Findings Directory

This directory receives audit reports and bug-backlogs from TheInspector audit runs post-merge.

## Latest: Dependency Auditor Audit (2026-06-30)

**Status: COMPLETE** | **Grade: C** | **Critical: 3** | **High: 6+** | **Moderate: 10+**

### Files
- **`dependency-audit-2026-06-30.md`** — Full narrative report with remediation steps
- **`dependency-audit-2026-06-30.json`** — Machine-readable summary for dashboards

### Key Findings Summary
| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 3 | handlebars JS injection, protobufjs prototype pollution, vitest version mismatch |
| HIGH | 6+ | form-data CRLF injection, vite env leak, opentelemetry crashes, react-router open redirect |
| MODERATE | 10+ | express/qs DoS, uuid buffer overflow, esbuild CORS bypass |
| LOW | 1–2 | @babel/core file read |

### Supply Chain Health
- **Transitive Dependencies:** 412–578 per module (moderate risk surface)
- **Post-install Scripts:** None (✓ safe)
- **License Compliance:** MIT/BSD/Apache only (✓ safe)
- **Abandoned Packages:** None (all actively maintained ✓)
- **Outdated Major Versions:** pino (2 versions), uuid (4 versions behind)

### Immediate Action Items
1. [ ] Upgrade handlebars to >=4.7.9 (critical JS injection)
2. [ ] Upgrade @opentelemetry/auto-instrumentations-node to 0.77.0 (Prometheus crash)
3. [ ] Synchronize vitest to 2.1.9 (breaking test runner changes)
4. [ ] Fix form-data, vite, opentelemetry crashes (P2)
5. [ ] Audit & fix all modules (`npm audit fix`)

See **`dependency-audit-2026-06-30.md`** "Remediation Plan" section for detailed steps.

---

## File Patterns

- **Dependency audits**: `dependency-audit-YYYY-MM-DD.{md,json}`
  - Markdown for human reading
  - JSON for dashboards and metrics

- **Audit reports (security/performance/quality)**: `audit-YYYY-MM-DD-{grade}.html`
  - Example: `audit-2026-04-07-A.html`
  - Grade can be: A, B+, B, B-, C+, C, C-, D, F
  - Contains detailed security, chaos, performance, and quality findings

- **Bug backlogs**: `bug-backlog-YYYY-MM-DD.json`
  - Example: `bug-backlog-2026-04-07.json`
  - JSON structure with discovered bugs, severity levels, and remediation guidance

## .gitignore

HTML audit reports are large and not committed to git. The `.gitignore` in this directory excludes `*.html` files to keep the repository lean. Bug-backlog JSON files are tracked for record-keeping and trend analysis. Dependency audit files (MD + JSON) are tracked.

## Workflow

1. TheInspector team runs scheduled/post-merge audits
   - Dependency scanning (bi-weekly via dependency_auditor)
   - Security scanning (via static-analyzer, red-teamer)
   - Performance scanning (via performance-profiler)
   - Chaos testing (via chaos-monkey)
2. Reports are generated and written to this directory
3. Bug backlog is updated with newly discovered issues
4. Team lead aggregates findings into sprint planning

## Accessing Findings

### For TheFixer Team
- Read `dependency-audit-2026-06-30.md` → "Remediation Plan"
- Execute commands in Source/Backend, Source/Frontend, portal/Backend
- Verify with `npm test` and `npm audit --json`

### For TheGuardians (Security)
- Check "Escalations" section in audit report
- Handlebars: Assess template rendering risk in portal
- form-data: Review file upload filename sanitization
- OpenTelemetry: Validate /metrics endpoint input handling

### For Leadership
- Use `.json` files for metrics and trend tracking
- Create GitHub issues for each P1/P2 finding
- Schedule follow-up audit (bi-weekly cadence recommended)
