# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### First Combined Audit — 2026-09-15

**Grading:**
- When dependency-auditor surfaces P1 CVEs, they dominate the combined grade. Quality-oracle may score B on its own but combined grade drops to D if ≥3 P1 CVEs are present.
- Always compute grade after ALL specialists complete — never report the quality-oracle grade as the final grade.

**Dynamic specialists:**
- performance-profiler and chaos-monkey require live services. If backend (port 3001) or frontend (port 5173) are unreachable, set their mode to "N/A" and note in §4 (Scope). Do not skip their report sections — include them with "No dynamic data available" explanations.

**Cross-reference map (§8):**
- Key cross-refs in this project:
  - QO-003 + QO-004: root cause = traceability tooling gap
  - DEP-001 + DEP-004: root cause = stale platform/orchestrator deps (one update sweep)
  - QO-001 + QO-006: root cause = missing service layer in backend
- Look for DEP findings in the same workspace — they can often be batched into a single `npm update` command.

**Escalation routing:**
- DEP P1 CVEs involving RCE, file disclosure, or injection → always escalate to TheGuardians regardless of location (even test tooling like vitest).
- DoS CVEs (DEP-004) → TheGuardians when they affect infrastructure (orchestrator, portal backend).
- QO code-quality P1 (missing routes, test failures) → TheFixer, not TheGuardians.
- When no PR exists, use printf escalation block — do not fail silently.

**Report sections:**
- All 16 sections must appear even when data is absent (e.g., §14 Fixed = "None — first audit").
- §12 Latency Baselines: always include static analysis notes from config.performance.static_checks even when dynamic data is unavailable.
- §8 Cross-Reference Map is the most valuable remediation-planning section — invest time building it from [CROSS-REF] tags and workspace clustering.

**Dependency audit patterns:**
- portal/Backend consistently has the largest attack surface (577 transitive deps in this project). Triage its highs first after clearing P1s.
- Frontend dev dep cluster (vite/vitest/postcss/nanoid) often has concurrent CVEs — patch as a batch.
- form-data and browserslist are cross-workspace recurring CVEs — one npm update sweep closes multiple P2 entries simultaneously.
