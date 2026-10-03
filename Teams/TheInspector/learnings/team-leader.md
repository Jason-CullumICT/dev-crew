# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run 2026-10-03 · Audit `run-20261003-080024`

### Scoping

- **portal/ is the primary implementation codebase** — all FR-001–089 live there, not in `Source/`. Any audit that excludes `portal/` misses 92% of the codebase. The enforcer's hardcoded `source_dirs = ["Source", "E2E"]` was the biggest systemic gap found this audit.
- **Services were offline for every audit run so far.** Dynamic mode (performance-profiler, chaos-monkey) has never executed. If services are available, prioritize enabling dynamic specialists — static-only audits leave latency and fault-resilience blind spots.

### Grading

- **Grade D triggered by 3 P1s.** The C threshold is max_p1: 2. Two of the three P1s were dependency CVEs (vitest RCE + gRPC auth bypass), not code bugs — this means dependency hygiene alone can sink the grade.
- **Spec coverage percentage is misleading without enforcer scope correctness.** 8.3% enforced / ~85% actual is a tool configuration bug, not a code quality signal. Always verify the enforcer's scope before interpreting coverage numbers.

### Escalation

- **Escalation triggers matched in this run:**
  - DEP-001: `sensitive data exposed` (Vitest RCE exposes .env)
  - DEP-003: `auth bypass` (gRPC TLS cert bypass)
- **No PR was open** — used terminal fallback escalation (stdout warning). In future runs with a PR, use `gh pr comment` pattern from team-leader.md.
- **Never route DEP escalations to TheFixer without TheGuardians sign-off** — the version bump is necessary but not sufficient; environment hardening review is required.

### Cross-Reference Map

- Four root causes each covered multiple finding IDs. Presenting these as a cross-reference table (root cause → affected findings → single fix) is the most actionable synthesis output — do this every time.
- Root causes found: vitest outdated, jest outdated, gRPC stack outdated, enforcer ignores config.

### Report Generation

- **16-section HTML report is the source of truth.** `inspector-report.md` is a navigation aid; the HTML has the full detail operators need.
- **JSON backlog must include a separate `escalations` array** distinct from `p1_findings` — some P1s go to TheFixer, escalations go to TheGuardians. Mixing them would cause wrong routing.

### Dependency Auditor Observations

- Jest ecosystem is disproportionately large (200+ of 413 Backend transitive deps). This is a recurring watch item — monitor jest CVE advisories monthly.
- `@grpc/grpc-js` has a history of cascade CVEs. The pattern is: dockerode pins an older grpc-js, which drags in vulnerable protobufjs + path-to-regexp. Always check orchestrator transitive deps as a cluster.
- `vitest` had a critical CVSS 9.8 CVE that applies to the UI server — remind devs that `npm run dev` with `--ui` flag must only bind to localhost.

### Quality Oracle Observations

- Ghost FRs (code annotations referencing non-existent specs) are a spec-first violation. They appear when coders write code ahead of the spec writer. Enforce: if a `// Verifies:` comment references an FR not in any plan file, it's a ghost FR.
- FR ID collision (two plans both defining FR-070) happened because plans were authored independently without a shared FR registry. Recommend: maintain a global `Specifications/fr-registry.md` as the single ID allocation table.
