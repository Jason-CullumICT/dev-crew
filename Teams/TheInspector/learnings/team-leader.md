# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-24 — First Audit Run

#### Codebase has THREE separate source trees — all need scoping

This repo is not a single product. It contains:
| Application | Source Dir | Spec Namespace |
|---|---|---|
| Workflow Engine | `Source/` | FR-WF-001 to FR-WF-013 |
| Dev Workflow Platform | `portal/` | FR-001 to FR-095 + FR-DUP-* |
| Tiered Merge Pipeline | `platform/orchestrator/` | FR-TMP-001 to FR-TMP-010 |

Always scope quality-oracle and dependency-auditor across all three trees. The config `source.dirs` currently only lists `Source/` — override to include `portal/` and `platform/` in the audit plan.

#### Traceability enforcer is broken for 2 of 3 codebases

`tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. Running it against portal/ or platform/ specs produces 76 and 13 false failures respectively. Do NOT trust enforcer output for those specs until QO-001 is fixed. Inform quality-oracle of this limitation at start of each run until the fix lands.

#### Services were offline — flag in scope section

`localhost:3001` and `localhost:5173` were unreachable. Performance profiler and chaos monkey produced no output. Always check service availability first and note in scope + specialist assignment plan. Re-run with `curl -sf http://localhost:3001/ > /dev/null` before assigning dynamic mode.

#### Grade thresholds (from inspector.config.yml)

```
A: max_p1:0, max_p2:3, min_spec_coverage:80
B: max_p1:0, max_p2:8, min_spec_coverage:60
C: max_p1:2, max_p2:15, min_spec_coverage:40
D: max_p1:999
F: exploitable auth bypass + critical domain failure (domain app, not test infra)
```

Key nuance: CVEs in dev-only tools (vitest, esbuild, postcss) count as P1/P2 by CVSS but the domain application itself (workflow engine) was clean. F is for exploitable auth bypass in the **domain** application, not CI tooling.

#### DEP-002 (uuid) affects BOTH Source/Backend and portal/Backend

When QO and DEP both flag the same package, DEP owns the finding. QO should cross-ref but not duplicate. In the combined backlog, uuid shows as DEP-002 (P1 CVE) + DEP-017 (P3 outdated) — they are distinct findings for different aspects but the same fix resolves both.

#### Supply chain risk was LOW despite 101 CVEs

The 101 vulnerabilities are almost entirely in the test/build toolchain (vitest, babel, jest, vite). The runtime production dependency graph is small and healthy. Supply chain risk (post-install scripts, abandoned packages) was clean. Calibrate severity communication accordingly — 101 sounds alarming but 3 are actionable RCE/overflow in practice.

#### Cross-reference map is critical for remediation planning

The most useful synthesis output is Section 8 (Cross-Reference Map). The vitest/vite ecosystem finding alone covers 7 findings (DEP-001/003/004/005/006/009/013) with a single `npm install vitest@^4.1.9` command. Build the cross-ref map first, then let it drive Section 15 (Recommendations).

#### Escalation path when no PR is open

No PR was open on this branch. Used console escalation format (printf path). TheGuardians trigger instruction was embedded in inspector-report.md and the HTML report escalation banner. Future: if a PR is opened on this branch, re-run the gh pr comment block.

#### Report filename includes grade

Config pattern `audit-{date}-{grade}.html` → written to `Teams/TheInspector/findings/audit-2026-06-24-D.html`. The findings/ directory gitignore may need updating if HTML files are not tracked — check `.gitignore` in that directory before future runs.
