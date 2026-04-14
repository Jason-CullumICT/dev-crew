# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-04-14 (run-20260414-211936)

### Status: Aborted — Prerequisites Not Met

**Exit Condition 1 — Backend Not Running:**
- `http://localhost:3001/` was unreachable. The red-teamer requires the ephemeral test environment to be live before any active exploitation attempt.
- The docker-compose file exists at `platform/docker-compose.yml` but the test environment was not started.

**Exit Condition 2 — No Attack Surface Map:**
- `Teams/TheGuardians/artifacts/attack-surface-map.md` did not exist.
- The pen-tester must run first and produce at least one `### PEN-` finding before the red-teamer can derive exploit chains.

### Pipeline Order Reminder

The correct execution order is:
1. Start ephemeral environment
2. pen-tester → produces `attack-surface-map.md`
3. red-teamer → reads map, chains exploits against live endpoints

### Objectives Queued (from security.config.yml)
- Bypass work item state machine (force invalid status)
- Access/modify soft-deleted work items via direct ID reference
- Malformed assessment verdict bypassing routing
- Enumerate work items without pagination limits

### Dead Ends (this run)
- None attempted — environment was down before any probing started.
