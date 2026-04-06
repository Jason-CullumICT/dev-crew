# Deferred Pipeline Architecture

> **Status:** Deferred — requires multi-component architectural changes beyond a single sprint.
> These items were identified during the pipeline-hardening and team-review sessions (2026-04-07).
> Each item here is a standalone piece of work with its own spec, design, and implementation cycle.

---

## Item 1: WebSocket Live Log Streaming

### Problem
Agent output during a pipeline cycle is only visible after the phase completes (via `outputTail`). Long-running phases (30min timeout) produce no feedback to the dashboard until they finish or fail. Operators cannot tell if a cycle is making progress or silently stuck.

### Goal
Stream agent `stdout` in real-time from the worker container to the orchestrator, and forward it to connected dashboard clients via WebSocket. Operators see a live tail of each agent's output as it runs.

### Scope

**Three components must change together:**

| Component | Change |
|-----------|--------|
| `platform/orchestrator/lib/docker-client.js` | Replace one-shot `exec` with a streaming exec that emits stdout chunks as they arrive |
| `platform/orchestrator/server.js` (or equivalent) | Add a WebSocket endpoint (`/ws/runs/:id/logs`) that subscribes to the stream for a given run |
| `portal/` (Debug UI frontend) | Add a live log panel that connects to the WebSocket and appends lines |

### Design decisions to make before implementing

1. **Backpressure:** if the WebSocket client disconnects, does the container exec stop or buffer? Buffering risks OOM for long phases.
2. **Log multiplexing:** multiple agents may run in parallel (stage.parallel=true). How are their streams distinguished in the WebSocket channel? Options: separate channels per agent, or prefix each line with `[role]`.
3. **Persistence:** should the streaming log replace `outputTail`, or complement it? `outputTail` is used by feedback loops — it must remain.
4. **Security:** the WebSocket endpoint has no auth today. If added, it must not block pipeline operation if the WS server fails.

### Suggested implementation order
1. Spike: add streaming exec to docker-client.js for a single exec call, verify chunks arrive
2. Add WS server endpoint, pipe chunks to connected clients
3. Add portal log panel (basic, no styling)
4. Wire parallel agent streams with `[role]` prefixes
5. Ensure `outputTail` still captures the last 2000 chars for feedback loop compatibility

---

## Item 2: Multi-Model Consensus Review

### Problem
The auto-merge AI review (`_aiReviewPR()`) uses a single Claude call to decide APPROVE or REQUEST_CHANGES. A single model can be wrong, confused, or hallucinate. For high-stakes merges (medium/high risk), a single model's APPROVE should not be the sole gate.

### Goal
For medium and high risk cycles, require two independent model calls (different sampling) to both output APPROVE before auto-merge proceeds. If they disagree, the PR stays open for manual review.

### Scope

**One component changes, but the design has several decision points:**

| Component | Change |
|-----------|--------|
| `platform/orchestrator/lib/workflow-engine.js` — `_aiReviewPR()` | Run two parallel reviewer calls; require both to APPROVE |
| `platform/orchestrator/lib/config.js` | `CONSENSUS_REVIEW_RISK_LEVELS` env var to control which risk levels require consensus |

### Design decisions to make before implementing

1. **Diversity:** two calls to the same model with the same prompt will correlate. Options:
   - Same model, different temperature (not controllable in Claude API currently)
   - Different models: one sonnet, one opus
   - Same model, different review prompts (reviewer A looks for security issues, reviewer B looks for correctness)
   - **Recommended:** Two prompts — adversarial framing ("find reasons to block") vs. neutral framing ("assess readiness")

2. **Disagreement handling:** if one APPROVEs and one REQUEST_CHANGESs, what happens?
   - Options: conservative (REQUEST_CHANGES wins), democratic (majority — 2/2 required for APPROVE), escalate to human
   - **Recommended:** conservative — REQUEST_CHANGES from either reviewer blocks

3. **Cost:** two reviewer calls per cycle at medium risk (the default) doubles review cost. Consider limiting consensus to high risk only initially.

4. **Timeout:** if one reviewer times out, does that count as REQUEST_CHANGES or is it retried?

5. **PR comment:** the combined review comment should include both reviewers' reasoning, not just one.

### Suggested implementation order
1. Refactor `_aiReviewPR()` to accept a list of reviewer configs (prompt + model)
2. Implement single-reviewer mode (current behaviour) as the default list
3. Add dual-reviewer mode behind `CONSENSUS_REVIEW=true` env var
4. Test with two adversarially-framed prompts on a known-good and known-bad PR
5. Promote dual-reviewer to default for medium+high risk

---

## Item 3: Orchestrator Two-Stage → Multi-Stage DAG

### Problem
`dispatch.js classifyRoles()` puts all non-coder roles into a single parallel QA stage. TheATeam's three-tier ordering (Tier 1: read-only parallel, Tier 2: test-runner sequential, Tier 3: browser+ports sequential) is defined in the team-leader prompt but not enforced by the orchestrator. The team-leader must produce a correctly-ordered dispatch plan — the orchestrator just executes whatever is given.

This means:
- `design-critic` (needs live browser) may run simultaneously with Tier 1 read-only agents (port contention)
- If the leader produces a flat plan, sequential guarantees are lost
- The orchestrator has no way to validate that the dispatch plan respects the tier ordering

### Goal
Extend the orchestrator to support a dispatch plan format that declares explicit stage sequencing, so Tier 2/3 agents run after Tier 1 completes regardless of what the leader writes.

### Scope

| Component | Change |
|-----------|--------|
| `platform/orchestrator/lib/dispatch.js` | `classifyRoles()` extended to support multi-stage QA (or replaced with plan-schema validation) |
| `platform/orchestrator/lib/workflow-engine.js` | Stage execution loop already iterates stages in order — the issue is that all QA stages currently collapse into one; need to preserve multiple QA stages from the dispatch plan |
| `Teams/TheATeam/team-leader.md` | Update dispatch plan format instructions to use three separate stage entries for the three tiers |
| `Teams/TheFixer/team-leader.md` | Same — separate stage for Tier 2 design-critic |

### Design decisions to make before implementing

1. **Dispatch plan schema:** currently stages are just `{ name, agents[], parallel }`. Add a `requiresPorts: boolean` or explicit `tier: 1|2|3` field? Or rely on stage ordering from the dispatch plan (already respected)?
   - **Recommended:** rely on stage ordering — the leader writes three stage entries, the orchestrator runs them in sequence. No new schema needed; just update the leader instructions to produce three stages.

2. **classifyRoles() vs. dispatch plan:** `classifyRoles()` is only used for the fallback plan. The real plan comes from the leader. So the fix may be primarily in the leader prompt (write three stage entries) with a validation step in the orchestrator to warn when all QA agents are in one stage.

3. **Fallback plan:** `buildFallbackPlan()` always collapses to 1 impl + 1 QA. For the fallback case, add a minimal Tier 1 and Tier 2 split.

### Suggested implementation order
1. Update team-leader prompts to produce three-stage QA dispatch plans
2. Add an orchestrator validation warning when all non-coder agents appear in a single stage (indicates leader produced a flat plan)
3. Update `buildFallbackPlan()` to produce two QA stages (Tier 1 parallel, Tier 2 sequential with `requiresPorts`)
4. Test with a TheATeam cycle and verify design-critic runs after Tier 1 completes

---

## References

- Pipeline-hardening session: commits `28e12823`–`d9203339` (2026-04-07)
- Team review audit: identified during review in session 2026-04-07
- Related plan: `Plans/pipeline-hardening/plan.md`
- Mechanical check gates: `platform/scripts/mechanical-checks.sh`
- Orchestrator stage loop: `platform/orchestrator/lib/workflow-engine.js` Phase 3 (~line 1175)
