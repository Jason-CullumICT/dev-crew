# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-31 — First audit run

**Project structure:**
- `Source/` contains the workflow engine (FR-WF-* and FR-dependency-* naming schemes)
- `portal/` contains a separate portal app (FR-001–069 in Specifications/)
- `Plans/` contains the active requirements files that Source/ implements
- These are two separate products — do NOT cross-reference Specifications/ against Source/

**Config mismatch (QO-001):**
- `inspector.config.yml` currently maps `specs.dir: Specifications/` (portal specs) against `source.dirs: Source/` (workflow engine) — this is wrong and produces invalid drift analysis
- Until fixed: use `Plans/*/requirements.md` as the canonical spec source for Source/ analysis
- Traceability pattern needs to be `FR-[A-Z][A-Z0-9-]+` not `FR-\d+`

**Dependency landscape:**
- Both Backend and Frontend have ~411 transitive deps (within 500 threshold)
- First audit found 4 P1 critical CVEs — all related to outdated vitest (2.0.5) and express (proxy-addr)
- Key update chain: `npm update express` (Backend) + `npm update vitest` target >=5.0.5 (Frontend) resolves 6 P1/P2 CVEs at once
- Vite is 3 major versions behind — requires dedicated testing sprint

**Specialist modes:**
- Services were offline during this audit — performance-profiler and chaos-monkey could not run
- When services are available, all 4 specialists should run; dynamic mode provides latency baselines and fault injection coverage that static mode cannot replace

**Escalation:**
- No PR was open when escalation ran — console warning printed only
- All 4 security P1s (DEP-001 through DEP-004) require TheGuardians sign-off before closure

**Grading reference:**
- Grade D = 5 P1 findings (threshold for C is max_p1:2)
- If P1 count drops to ≤2 and P2 drops to ≤15 with spec coverage ≥40%, next audit could reach C
- Patching the 4 CVE P1s (DEP-001–004) alone brings P1 count to 1 (QO-001 config) — that's grade C territory

**Synthesis pattern that worked:**
- Read quality-oracle-report.md + dependency-auditor-report.md + detailed findings files in Teams/TheInspector/findings/
- Compute totals manually (don't trust specialist grade alone — their scope is partial)
- Apply grading thresholds from inspector.config.yml
- Cross-reference map built by looking for packages that resolve multiple findings
- HTML report generated inline (no external tool needed)
