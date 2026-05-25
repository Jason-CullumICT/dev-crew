# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-25 — First Combined Audit (run-20260525-065040)

**Project topology is split across Source/ and portal/:**
- `Source/` contains the main Express/React app (work item workflow)
- `portal/` contains a separate SQLite-backed app implementing ~80% of product FRs
- `platform/` contains orchestrator infrastructure
- The quality-oracle self-report says B, but the combined grade with dependency audit is D — always run both specialists before grading

**Grading gotcha — transitive CVEs inflate P1 count fast:**
- Two CVSS 9.8 CVEs in transitive deps pushed us from B (quality-only) to D (combined)
- Both are fixable with `npm update` — they're severity-3 CVEs not exploitable-in-context, but the grading config counts raw P1s
- Consider adding a `transitive_cve_discount` note to config for future audits if the project owner wants to distinguish "trivially fixable transitive CVE" from "architectural P1"

**Services were offline at audit time:**
- performance-profiler and chaos-monkey both skipped
- No latency baseline established — the static flag about unbounded Map iteration on GET /api/work-items is the only performance signal
- Next audit: bring services up first, or document why static-only is acceptable

**Traceability enforcer is the single highest-leverage fix:**
- QO-001 + QO-004 share the same root cause (enforcer config)
- One fix to `tools/traceability-enforcer.py` resolves a P1 + a P2 and restores gate integrity for all 140 requirements
- Push this to TheFixer as the first task

**Cross-reference map efficiency:**
- 5 root-cause fixes resolve 12 of 23 findings (52%)
- Always build the cross-reference map — it's the highest-value synthesis for remediation planning

**No prior baseline:**
- This was the first combined audit. The findings/README.md describes a pattern of `audit-YYYY-MM-DD-{grade}.html` files but none existed before today
- The quality-oracle had produced `audit-2026-05-25-B.md` as an md file (not html) — this was its own internal filing
- Going forward: the HTML file (`audit-2026-05-25-D.html`) is the canonical combined report

**Escalation flow:**
- DEP-001 and DEP-002 are injection/RCE class → TheGuardians
- All other findings → TheFixer via bug-backlog-2026-05-25.json
- No PR was available for gh pr comment; used printf fallback

**File outputs to write:**
1. `inspector-report.md` at repo root (the user-facing deliverable)
2. `Teams/TheInspector/findings/audit-{date}-{grade}.html` (full 16-section report)
3. `Teams/TheInspector/findings/bug-backlog-{date}.json` (structured JSON for TheFixer)
4. Update `Teams/TheInspector/learnings/team-leader.md` (this file)
