# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-20 — First combined audit (quality-oracle + dependency-auditor)

**Grading with multiple specialists:**
- Grade is determined by the *combined* P1/P2 counts across all specialist reports, not each specialist's grade independently.
- quality-oracle alone graded C (1 P1, 5 P2). Adding dependency-auditor's 2 critical CVEs pushed the total P1 count to 3, which exceeds the C threshold (max_p1=2) → combined grade D.
- Always synthesise totals before assigning grade.

**Cross-referencing saves remediation effort:**
- dockerode upgrade resolves 3 findings at once (DEP-001 P1 + DEP-008 P2 + DEP-009 P2).
- vite upgrade resolves 2 findings (DEP-004 P2 + DEP-011 P3).
- Document these cross-refs prominently — they are high-value for the TheFixer backlog.

**Specialist skipping:**
- performance-profiler and chaos-monkey require running services. When services are offline, log them as SKIPPED with the reason — do not attempt static fallback for their sections.
- Always note which fault scenarios from inspector.config.yml were untested.

**Spec authority confusion:**
- This project has both `Specifications/` (legacy, different system) and `Plans/*/requirements.md` (active). The active plans are the real authority; `inspector.config.yml` incorrectly points to `Specifications/`.
- In future audits, clarify spec authority in the Scope section upfront. Recommend archival as QO-002.

**Escalation routing:**
- Dependency CVEs with CVSS ≥ 9.0 and no auth requirement → always escalate to TheGuardians.
- Open redirects → escalate if they touch routing logic that could affect login flows.
- Ensure escalation findings appear in a separate `escalations` array in the JSON backlog (not in `bugs`).

**First audit baseline note:**
- The "Trend" section should explicitly call out prior partial audits (QO-only) vs. combined baseline.
- Next audit will have a proper combined baseline — track grade delta (D → target C).

**Services check:**
- Run `curl -sf {url} > /dev/null 2>&1` for each service in inspector.config.yml before dispatching specialists.
- Log service status in Scope section; it determines dynamic vs. static mode per specialist.
- In this run: both backend (3001) and frontend (5173) were offline → only static analysis ran.
