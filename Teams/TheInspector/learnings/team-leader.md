# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-14 — First Audit Run

**Environment / Service Availability**
- Services at `http://localhost:3001` (backend) and `http://localhost:5173` (frontend) were not running during the audit.
- performance-profiler and chaos-monkey were skipped entirely (both require at least backend up).
- For richer audits: start services before invoking TheInspector. Even a `docker compose up -d` stub helps.

**Grading Note**
- The `grading.C` threshold (`max_p1: 2`) is quickly breached when dependency-auditor finds RCE CVEs.
- A P1 from dep-auditor + 2 P1s from quality-oracle alone pushes to D.
- Consider whether CVEs in dev-only dependencies (e.g. Vitest) should count as architectural P1 or be down-graded to P2 for grading purposes.

**Enforcer Blind Spot (recurring risk)**
- `tools/traceability-enforcer.py` reads only the last-modified `Plans/**/requirements.md`.
- It completely ignores `Specifications/` — which is the CLAUDE.md-designated source of truth.
- This will re-appear as QO-002 in every audit until fixed. Prioritise this fix.

**Cross-Reference Map Value**
- Four cross-references were identified where 2–3 findings share a single root cause.
- The most impactful: QO-002 + QO-003 (spec tooling gap); DEP-003 + DEP-009 + DEP-010 (platform dep tree).
- Highlight cross-refs prominently in the executive summary — they compress the fix list significantly.

**Dep Auditor CVE Volume**
- portal/Backend had 55 CVEs due to heavy transitive dependency load from gRPC + protobufjs.
- Source/E2E was the only clean project (0 CVEs).
- `npm audit fix` will not resolve all CVEs (some require major version upgrades of parent packages).
- Document remaining unfixable CVEs explicitly so operators know what `audit fix` left behind.

**Escalation Routing**
- Ran the escalation block; no PR/repo detected, so escalation was printed to stdout.
- In CI/CD environments with a PR open, the gh pr comment path will work.
- Finding summary for the escalation should be concise (1 sentence) — the banner is shown to operators who may not read the full report.

**Report Path Convention**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (repo root, as requested by parent session)
- Raw dep audit: `Teams/TheInspector/findings/dependency-audit-{date}.md` (written by specialist)
