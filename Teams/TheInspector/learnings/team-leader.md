# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-07 — First Audit Run

**Grading arithmetic:**
- Combine P1 and P2 counts across ALL specialists before applying `inspector.config.yml` thresholds.
- quality-oracle (C) + dependency-auditor (D) = combined Grade D (5 P1 total > threshold of 2 for grade C).
- Never grade by individual specialist — always grade the combined cross-specialist total.

**Report file naming:**
- HTML report is saved as `audit-{date}-{grade}.html` (e.g. `audit-2026-08-07-D.html`) per `config.report.filename_pattern`.
- HTML files are gitignored per `findings/.gitignore` — this is expected. Backlog JSON IS tracked.
- Bug backlog JSON replaces the existing `bug-backlog-{date}.json` if specialists wrote partial versions earlier.

**Escalation triggers to watch (from this audit):**
- `injection` → any CVE with "injection" in title or description → TheGuardians
- `sensitive data exposed` → file read CVEs that expose `.env`, source, keys → TheGuardians
- DoS-only CVEs (brace-expansion, qs, js-yaml, body-parser) → TheFixer, NOT TheGuardians
- Tooling defects (traceability enforcer bugs) → TheFixer

**Cross-reference patterns that recur:**
- Outdated frontend build chain (vite/esbuild/postcss) typically resolves as a cluster with one upgrade.
- Express 4.x carries the entire qs/body-parser/brace-expansion DoS chain — one express upgrade clears multiple P2/P3s.
- gRPC orchestrator stack (dockerode → grpc-js → protobufjs) chains together — one dockerode upgrade fixes both RCE and DoS.

**Static-only audit limitations:**
- Performance-profiler requires backend service online (localhost:3001).
- Chaos-monkey requires ALL services online.
- If services are offline, note it explicitly in Section 4 (Scope & Environment) and Section 12 (Latency Baselines).
- Recommend re-running with services live in next-sprint recommendations.

**Spec coverage arithmetic:**
- Report BOTH active-plans coverage (%) and full-spec coverage (%).
- When a deprecated/orphaned spec massively drags down full coverage, call this out explicitly (QO-004 pattern).

**Dashboard reporting:**
- Always init RUN_ID with `pipeline-update.sh --action init` before synthesis.
- Complete with `--action complete --verdict passed` even when the grade is D — "passed" means the audit pipeline itself completed, not the product health.
