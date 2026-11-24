# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-24 — First Audit Run

1. **inspector.config.yml `source.dirs` omits portal/ and platform/**  
   The config only lists `Source/` but the project has three implementation directories. This causes
   the traceability enforcer gate to silently skip 78 implemented requirements. Always cross-check
   config `source.dirs` against the actual directory tree before accepting enforcer results.

2. **Services were offline for this audit**  
   Both `localhost:3001` (backend) and `localhost:5173` (frontend) were unreachable. performance-profiler
   and chaos-monkey were skipped. The next audit should run with services live to get latency baselines
   and fault injection coverage.

3. **Dependency auditor is the dominant finding source**  
   196 CVEs across 10 npm projects. The orchestrator (`platform/orchestrator`) is highest risk —
   protobufjs and @grpc/grpc-js carry 15+ CVEs between them and are straightforward `npm update` fixes.
   Always check the orchestrator separately; it is a different node project from the app backend.

4. **Cross-reference grouping is valuable for remediation planning**  
   Four quality-oracle findings (QO-002, QO-003, QO-004, QO-008) all trace to the same incomplete
   feature (dependency-linking). Identifying this root cause reduced the apparent P2 count from 4 to
   1 actionable TheFixer task.

5. **Grade D despite high spec coverage**  
   96% spec coverage earns a notional B from quality-oracle, but the dependency audit's 6 P1 CVEs
   drive the overall grade to D. Spec coverage and dependency health are orthogonal dimensions —
   both must be reported prominently in the executive summary.

6. **No PR was open at synthesis time**  
   Used the console escalation path (printf) instead of the gh pr comment path. If a PR is open in
   future audits, the GitHub badge comment path creates a more visible escalation trail.
