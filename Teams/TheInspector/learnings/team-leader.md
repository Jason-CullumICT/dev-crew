# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-07 — First Full Audit Run

**Grading arithmetic:**
- The `inspector.config.yml` grading thresholds (`max_p1`, `max_p2`, `min_spec_coverage`) apply to the COMBINED total across ALL specialists, not per-specialist. Two specialists each grading C individually can combine to D if their P1 counts sum past the C threshold (max_p1=2).
- Always sum P1/P2 counts across all specialists before assigning the final grade.

**Escalation routing:**
- The "injection" security trigger fires on any CVE with "injection" in the description. Handlebars GHSA-2w6w-674q-4c4q triggered it correctly (DEP-001 → TheGuardians).
- Non-injection P1s route to TheFixer even if they involve CVEs (e.g., Vitest RCE, protobufjs RCE) — those are dependency maintenance issues, not security architecture concerns.

**Specialist skipping:**
- When both backend (localhost:3001) and frontend (localhost:5173) are offline, performance-profiler and chaos-monkey should be marked "skipped" with mode "services offline". The grade should note these gaps explicitly.
- Two skipped specialists means the grade is incomplete. Flag this in the report header.

**Spec coverage calculation:**
- The Specifications/ dir may contain historical specs for a different domain than what's implemented. Quality oracle must flag this ambiguity (QO-003 pattern). Do not silently ignore 0% coverage — raise it as P2+ even if the spec might be historical.
- When Specifications/ shows 0%, the overall min_spec_coverage condition for grade A/B/C cannot be met regardless of other factors. This alone pushes to grade D if the A/B/C spec thresholds aren't met.

**Cross-reference map construction:**
- The most valuable cross-refs are findings that share a ROOT CAUSE (one fix resolves multiple findings). Common patterns found:
  1. Missing infrastructure uniformly (OTel gap: one specialist says "not installed", another says "outdated in different workspace")
  2. Tooling bugs with multiple symptoms (enforcer has scope bug + regex bug = two findings, one root)
  3. One workspace with high CVE density (portal/Backend had 5 of 7 P2 CVEs)

**Report file naming:**
- config uses `audit-{date}-{grade}.html` and `bug-backlog-{date}.json`. Save to `Teams/TheInspector/findings/`.
- Also write `inspector-report.md` in the repo root as a human-readable markdown summary with embedded compact JSON.

**Dashboard pipeline:**
- Run `bash tools/pipeline-update.sh --team TheInspector --action init ...` at synthesis start to get RUN_ID.
- Complete with `--action complete --verdict passed --metrics '{"grade": "...", ...}'` after all files are written.
- The `verdict` is always "passed" for the team-leader (synthesis always completes successfully, even if the audit grade is F).

**Positive observations matter:**
- Always include positive observations even when grade is low. Operators need to know what's working so they don't over-index on the findings.
- The 438 `Verifies:` comment count and zero-console.log discipline were strong signals of good engineering culture even during a D-grade audit.
