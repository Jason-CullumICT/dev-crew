# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit History

### 2026-09-21 — First Full Audit

**Overall grade:** D  
**Specialists run:** quality-oracle (static), dependency-auditor (static)  
**Specialists skipped:** performance-profiler, chaos-monkey (services offline)  
**Run ID:** run-20260921-075805  
**Branch:** audit/inspector-2026-09-21-e7b25d

**Findings:**
- P1: 5 (QO-001, QO-002 tooling + DEP-001, DEP-002, DEP-003 dependency RCE/pollution)
- P2: 14 (QO-003..006 + DEP-004..013)
- P3: 6 (QO-007..009 + DEP-014..016)
- P4: 1 (license compliance — clean)
- Escalations to TheGuardians: 4 (DEP-001, DEP-002, DEP-003, DEP-013)

---

## Learnings

### 1. Grade calculation with multiple specialist grades

When specialists give conflicting grades (quality-oracle=B, dependency-auditor=F), combine total P1/P2 counts and apply the config grading thresholds to the combined totals:
- `config.grading.C` allows max_p1: 2 — if combined P1s exceed 2, fall to D
- `config.grading.F` is reserved for "exploitable auth bypass + critical domain failure" — dependency CVEs with conditional exploitability (user-supplied templates, LAN access) are P1 but don't automatically trigger F

### 2. Escalation routing when no PR exists

When `gh pr view` returns empty (branch not yet PRed), run the `printf` fallback rather than the `gh pr comment` path. Include the full finding summary text, the branch name, and clear instructions for triggering TheGuardians manually.

### 3. Performance and chaos specialists require live services

Both `performance-profiler` and `chaos-monkey` need backend/frontend online.  
Always check service health via `curl -sf http://localhost:3001/ > /dev/null 2>&1` before scheduling them.  
When skipped, clearly note in the report that latency baselines and fault-injection coverage are deferred.

### 4. Spec coverage calculation for multi-plan projects

This project has three distinct coverage scopes:
- **Source/ system** (FR-WF-001..013 + FR-dependency-*): covered by enforcer + manual scan
- **portal/** (FR-001..069): targets portal/; N/A for Source/ enforcer
- **platform/** (FR-TMP-001..010): targets platform/; N/A for Source/ enforcer

Report "N/A" for the out-of-scope specs — do not count them as uncovered.  
Effective Source/ coverage: ~94% (27/29 actively enforced FRs).

### 5. Dependency audit drives overall grade down significantly

Even a B-quality codebase scores D overall when dependency-auditor returns F.  
In future audits, if dependency remediation has been applied (npm update run), re-run dependency-auditor to confirm the grade improves before calculating the combined grade.

### 6. Cross-reference map is most useful when organized by root cause

The most actionable cross-references in this audit were:
- "npm dependency staleness" → resolves DEP-001..012 in one remediation wave
- "Traceability enforcer scans single file" → resolves QO-001, QO-002, QO-004
- "Duplicate abstraction pattern" → resolves QO-005, QO-006

Grouping by root cause (not by finding ID) gives TheFixer clear batching targets.

### 7. Report output locations

- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (root of repo, required by parent session)

### 8. Confirmed watch-list packages for future audits

Packages with recurring CVE history in this codebase:
- `handlebars` — 8 distinct injection CVEs; update aggressively
- `vitest` — LAN-accessible UI server; always check version in devDeps
- `protobufjs` — prototype pollution; any gRPC service carries this risk
- `browserslist` — memory exhaustion in build pipelines; check in all frontend projects
