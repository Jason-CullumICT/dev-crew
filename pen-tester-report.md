## Attack Surface Map Complete

**Artifact written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`  
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

---

### Summary: 12 Findings Across 4 Severity Tiers

| ID | Finding | Severity |
|----|---------|----------|
| PEN-001 | Complete absence of authentication & authorization | **Critical** |
| PEN-002 | State machine bypass via unauthenticated `overrideRoute` fast-track | **Critical** |
| PEN-003 | Unauthenticated manual approval bypasses assessment pod | **Critical** |
| PEN-004 | IDOR on all work item endpoints | **High** |
| PEN-005 | Pagination limit bypass — full dataset exfiltration | **High** |
| PEN-007 | Cascade auto-dispatch fires on blocker *rejection* (logic flaw) | **High** |
| PEN-008 | Unauthenticated webhook intake with missing enum validation | **High** |
| PEN-006 | Soft-deleted blocker treated as unresolved — dispatch DoS | **Medium** |
| PEN-009 | No rate limiting — memory exhaustion DoS via intake spam | **Medium** |
| PEN-010 | Unauthenticated Prometheus metrics leaks operational data | **Medium** |
| PEN-011 | `/api/search` referenced but not implemented | **Low** |
| PEN-012 | Pagination NaN/negative integer silent failure | **Low** |

### Red Team Priority Attack Chains

The map includes three ready-to-execute exploit chains directly targeting the config-specified objectives:
- **Chain A (3 requests):** `overrideRoute: fast-track` → item goes backlog→approved→in-progress, assessment pod never touched
- **Chain B (4 requests):** Direct manual approve endpoint — same result via different path
- **Chain C:** Reject a blocker → cascade auto-dispatches the dependent item without the blocker work ever completing
