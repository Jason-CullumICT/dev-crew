# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-18 — First Audit Run

**Grading calibration:**
- With 4 P1s and 17% spec coverage (well below C's minimum 40%), the grade landed at D.
- The grading thresholds in inspector.config.yml are strict — C requires max_p1: 2. A single specialist surfacing 2 P1s (quality-oracle) plus another specialist with 2 more P1s (dependency-auditor) immediately pushes the grade below C.

**Specialist report formats:**
- quality-oracle produces a single `.md` report file written to `Teams/TheInspector/findings/audit-YYYY-MM-DD-{grade}.md` and also echoes findings to the handoff buffer.
- dependency-auditor produces three files: a `.md` detailed report, a `.json` machine-readable summary, and updates to learnings.
- Both report formats include a JSON block at the end — useful for structured extraction during synthesis.

**Service availability:**
- Both services (localhost:3001, localhost:5173) were down during this audit. Performance-profiler and chaos-monkey were skipped.
- The static-only audit is still highly valuable — spec drift and dependency vulnerabilities don't require running services.
- Next audit should confirm services are up before dispatching specialists, or schedule a follow-up dynamic-only audit.

**Escalation routing:**
- DEP-001 (Handlebars.js injection) and DEP-002 (protobufjs RCE) triggered the "injection" escalation rule in inspector.config.yml.
- No PR was open on the branch, so escalation was printed to stdout rather than posted as a PR comment.
- Platform/ directory files (platform/orchestrator) are solo-session territory — coordinate with platform owner before patching.

**Cross-reference map value:**
- Root Cause A (spec governance gap) unified 3 findings (QO-001, QO-002, QO-008) into a single ~2h fix. Without the cross-ref map, these would have appeared as 3 separate backlog items.
- Root Cause E (Vite version) unified 3 P3 dependency findings (DEP-006, DEP-007, DEP-008) into one npm command.

**Spec coverage calculation:**
- Count total requirements across ALL documents (Specifications/ and Plans/ combined).
- Active plans with 100% coverage (self-judging-workflow) do not compensate for 0% unbuilt plans.
- The 17% overall coverage figure accurately reflects that the project has far more planned work than implemented work.

**Finding ID convention:**
- quality-oracle uses QO-XXX prefix
- dependency-auditor uses DEP-XXX prefix (CVE findings) and DEP-OUT-XX (outdated packages)
- This convention should be adopted by performance-profiler (PP-XXX) and chaos-monkey (CM-XXX) when they run.

**Pattern checks that were CLEAN this run:**
- console.log in production: 0
- Empty catch blocks: 0
- Hardcoded secrets: 0
- Shared type imports: all correct
- Inline type re-definitions: 0
- Skipped tests: 0
- License violations: 0
These clean checks are worth preserving as a positive signal in the report scorecard.
