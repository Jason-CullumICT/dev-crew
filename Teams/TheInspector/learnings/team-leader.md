# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-07-04 — First audit run

### Grading

- With 4 P1s total (3 CVE + 1 runtime breakage), the project grades **D** under the config thresholds.
- The grade is dominated by dependency CVEs, not code quality. The code quality layer (quality-oracle) would have graded C on its own (1 P1, 97% spec coverage).
- When dependency-auditor finds critical CVEs, they almost always push the combined grade below what quality-oracle would assign alone.

### Escalation routing

- Security triggers hit: "injection" (DEP-001, DEP-003) and "sensitive data exposed" (DEP-002).
- No PR was open at audit time — escalation used console path. If a PR is open, `gh pr comment` path works cleanly.
- The escalation check (`gh pr view`) exits non-zero when no PR exists; check exit code before using PR_NUM.

### Cross-references are high-value

- Four root causes explained 10 of 24 findings. The cross-reference map (Section 8) is the highest-value section for remediation planning.
- Bundle express, vite, and gRPC chain upgrades into a single dependency-upgrade PR — TheFixer can do all three in one pass.

### Specialist modes

- Services (backend :3001, frontend :5173) were offline for this audit. Performance profiler and chaos monkey both had no findings as a result.
- For future audits: remind the triggering session to start services before running TheInspector if dynamic testing is wanted.

### Dependency auditor is the primary grade driver in this project

- dev-crew has very high spec coverage (97%) and clean code patterns overall.
- The transitive dependency surface (~800 packages across 4 projects) is where most risk lives.
- Recommend quarterly dependency audits even if code is stable.

### platform/ module boundary

- DEP-003 and DEP-008 are in `platform/orchestrator/` which is solo-session-only territory per CLAUDE.md.
- When routing these to TheFixer, flag them as needing a solo session — TheFixer MUST NOT touch platform/.
- TheGuardians security review should cover whether the gRPC port is network-accessible before declaring risk level.

### Enforcer coverage gap is a CI confidence problem

- QO-003 (enforcer covers 13/40 requirements) creates false CI confidence. This should be fixed before any new spec requirements are added.
- Until it's fixed, manually run the enforcer three times with explicit `--file` flags for full coverage.

### Spec coverage vs enforcer coverage distinction

- Spec coverage (97%) measures whether requirements are traced in source code (manual audit by quality-oracle).
- Enforcer coverage (32%) measures whether the automated CI gate checks those traces.
- These are two different things. High spec coverage with low enforcer coverage = good code, bad CI safety net.
