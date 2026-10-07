# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-07 — First audit run

1. **Dependency audit dominates grade** — Even a codebase with excellent code-quality discipline (no console.log, no hardcoded secrets, consistent types) can land at Grade D when the dependency layer carries critical unpatched CVEs. Always synthesise both specialist dimensions before grading.

2. **Services were offline** — performance-profiler and chaos-monkey were skipped because localhost:3001 and localhost:5173 were unreachable. In CI environments, static-only mode is the common case. Always note this in Section 4 (Scope & Environment) and Section 12 (Latency Baselines) so readers know what was not tested.

3. **Gate coverage vs. actual coverage are different metrics** — Quality-oracle reported 97% actual spec coverage but 12.7% effective gate coverage. Always report both numbers and distinguish them clearly. The gate number is what matters for process safety.

4. **Cross-reference map drives remediation efficiency** — Grouping findings by root cause (e.g. "upgrade @grpc/grpc-js resolves DEP-001 and DEP-007 together") saves engineering time. Build this map from `[CROSS-REF: specialist]` tags before writing Section 15 (Recommendations).

5. **Escalation block format** — When services are offline and no PR exists, use the plain-text escalation output format (not the gh pr comment path). The plain-text path still communicates urgency and instructions clearly.

6. **Grade D threshold** — With inspector.config.yml grading: C allows max 2 P1s. Five P1 findings (4 critical CVEs + 1 architecture violation) pushes straight to D. The next audit target is C: resolve all P1 CVEs + keep P2 ≤ 15.

7. **portal/Backend is the highest-risk workspace** — 578 transitive deps, 61 vulnerabilities, 4 critical. Always flag this workspace explicitly in the executive summary and recommend it as the first target for dependency pruning.

8. **vitest/tinypool** — P1 by CVSS (8.6) but lower production impact (test-time only). Note this distinction in the finding so TheFixer can triage correctly — it should be fixed but is not a deploy blocker.
