# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-30 — First Full Synthesis Run

**Grade F emitted when 3 × CVSS 9.8 RCE findings are present.** The config's F threshold
("exploitable auth bypass + critical domain failure") is met by RCE vulnerabilities even if
there is no traditional auth bypass — code execution IS the critical domain failure. Don't
conflate F-grade with only auth bypass scenarios.

**Spec coverage gap is a structural issue, not a one-time finding.** The traceability enforcer
only scans `Plans/*/requirements.md`. `Specifications/dev-workflow-platform.md` (74 FRs) is
entirely invisible to CI. This will keep appearing as P1 until the enforcer is updated or the
spec is formally archived. Route to TheFixer as `this_sprint` priority.

**performance-profiler and chaos-monkey produce no value in pure static mode.** If services
are offline, mark their verdict as `no_data` and note static observations only — don't attempt
to synthesise dynamic findings from static analysis alone.

**Cross-reference map is the highest-value synthesis output.** Operators find the
"one fix resolves N findings" table the most actionable part of the report. Always build it
by looking for shared root causes across specialist findings (e.g. "no CI audit gate" covers
all 4 P1 dependency findings at once).

**portal/Backend is the highest-risk workspace.** 55 of 99 CVEs originate there, all
traced to `@opentelemetry/auto-instrumentations-node@0.40.0`. Route DEP-004 as a TheFixer
architecture task — replacing the umbrella package with explicit pins clears the majority
of portal/Backend's vulnerability surface in one change.

**Always run the escalation block for injection/RCE findings.** DEP-001/002/003 all meet
the `injection` and `missing_access_control` triggers. The escalation should post a PR
comment if a PR is open; otherwise print the escalation summary to stdout.

**First audit baseline is important.** Since there was no prior inspector synthesis, all
107 findings are NEW. Future runs can compare FIXED / STILL OPEN / REGRESSED. Save the
JSON backlog so the next synthesis can diff against it.
