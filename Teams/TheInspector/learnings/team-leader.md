# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-11-07 — Full Static Audit

### Project Context

- **Product implemented:** Self-Judging Workflow Engine (workflow item intake, routing, assessment, dispatch)
- **Active spec:** `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md`
- **Misleading spec:** `Specifications/dev-workflow-platform.md` (FR-001–FR-069) describes a different historical product — do not use it for implementation guidance
- **Tech stack:** Express 4.x + React 18 + TypeScript + Vitest + Vite (all npm projects)
- **Package trees:** Source/Backend (398 transitive deps), Source/Frontend (217), Source/E2E (150, CLEAN)

### Service Availability at Audit Time

- Backend (localhost:3001): **OFFLINE** — dynamic mode was unavailable
- Frontend (localhost:5173): **OFFLINE** — dynamic mode was unavailable
- Performance-profiler and chaos-monkey were skipped (require live services)

### Grade Outcomes

- **2026-11-07:** Grade **D** (6 P1 findings — 4 CVEs + 2 spec-drift)
- **Grade history:** First audit — no prior baseline

### Key Finding Patterns (Watch List)

1. **express + proxy-addr + body-parser** — this ecosystem has had recurring critical CVEs in 2024–2025. Always check on audit. Fix: `npm install express@^4.22.0` resolves 3 findings at once.
2. **vitest/vite toolchain** — rapid development cycle; CVEs ship and fix quickly. Always `npm install vitest@latest vite@latest` together. Resolves 7 findings at once.
3. **uuid** — 5 major versions behind (9.0.0 vs 14.0.3). Has buffer overflow CVE. Plan major upgrade carefully for API compat.
4. **react-router-dom** — 1 major version behind (6.26.0 vs 7.x). Contains open redirect fix. Requires E2E coverage before merge.
5. **Specifications/dev-workflow-platform.md** — P1 structural issue: 69 requirements that describe a different product with 0% source coverage. This will keep appearing as QO-001 until remediated.
6. **GET /api/search** — Route is unimplemented but test file exists and fails. P1 until TheFixer implements it.

### Synthesis Lessons

- **Grade D threshold:** 5+ P1s = D (config: C allows max 2 P1s, D = anything worse)
- **Cross-reference strategy works:** express fix resolves 3 findings; vitest fix resolves 7 findings. Lead with cross-refs in exec summary.
- **Security escalation trigger:** Any CVE with zero-auth network exploit → TheGuardians. Used for DEP-001, DEP-002, DEP-003.
- **No PR context in this run** (no open PR) → escalation printed to stdout per fallback path.

### Traceability Enforcer Limitation

- Enforcer only reads `Plans/*/requirements.md` — always passes on this project.
- `inspector.config.yml` sets `specs.dir: "Specifications/"` but enforcer ignores it.
- Structural coverage is ~28% (27 of 97 FRs across all domains traced).
- This creates a persistent false green gate (QO-003) until solo-session updates the enforcer.

### File Locations

| Resource | Path |
|----------|------|
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Latest HTML report | `Teams/TheInspector/findings/audit-2026-11-07-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-11-07.json` |
| Dependency audit detail | `Teams/TheInspector/findings/dependency-audit-2026-11-07.md` |
| Quality oracle report | `quality-oracle-report.md` (repo root) |
| Dependency auditor report | `dependency-auditor-report.md` (repo root) |
| Inspector summary | `inspector-report.md` (repo root) |
