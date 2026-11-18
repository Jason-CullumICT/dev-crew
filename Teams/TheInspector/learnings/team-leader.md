# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-11-18 — First Audit Run

### Synthesis patterns that worked
- Reading `spec-drift-report.json` alongside `quality-oracle-report.md` confirmed the traceability blind spot independently (QO-001) — good cross-check
- `Teams/TheInspector/findings/AUDIT_SUMMARY.json` from dependency-auditor provides clean machine-readable data for scorecards; prefer it over parsing the markdown report
- Grading: when P1 count exceeds C threshold (>2) and security escalations are present, the grade is D or F — resolve by checking the F condition explicitly (auth bypass + critical domain failure both present in same layer = F, else D)

### Gaps to watch
- performance-profiler and chaos-monkey did not run (services offline) — the HTML report §12 (Latency Baselines) must note "not measured" and reference the config budgets for future runs
- The enforcer's `PASS` verdict is a known false signal for domain specs — flag QO-001 as STILL OPEN in every future audit until the enforcer is fixed
- Cross-reference map (§8) is high-value: the vitest single-upgrade that eliminates 8 of 12 criticals, and the service-layer fix that resolves 2 architecture findings, should always be surfaced

### Format decisions
- HTML report: used all 16 mandatory sections. §14 (Fixed Findings) and §7 (Re-Verification) show "first audit" message — keep this pattern
- Bug backlog JSON: top-level `escalations` array kept separate from `findings` — this is the correct split for routing to TheGuardians vs TheFixer
- The `inspector-report.md` embeds the full JSON backlog in a code block — readable in GitHub UI without opening a separate file
