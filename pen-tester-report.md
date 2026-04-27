The pipeline dashboard has no active run (expected for a standalone invocation), but the attack surface map and learnings are fully written. Here's the summary of findings:

---

## Attack Surface Map Complete

**Written to:** `Teams/TheGuardians/artifacts/attack-surface-map.md`

### Findings Summary

| ID | Severity | Title |
|----|----------|-------|
| PEN-001 | **Critical** | Complete Absence of Authentication — All Endpoints Unauthenticated |
| PEN-002 | **Critical** | Unauthenticated Fast-Track Override — Full Assessment Bypass |
| PEN-003 | **Critical** | Unauthenticated Manual Approve Override — Assessment Pod Bypassed |
| PEN-004 | **Critical** | Intake Webhooks Have No Authentication — Arbitrary Work Item Injection |
| PEN-005 | High | Unbounded Pagination Limit — Full Dataset Enumeration |
| PEN-006 | High | Soft-Deleted Items Permanently Block Dependent Dispatch (Dependency DoS) |
| PEN-007 | High | No Rate Limiting — Brute Force and DoS Surface |
| PEN-008 | High | Unauthenticated Prometheus Metrics Endpoint — Operational Intelligence Leak |
| PEN-009 | High | Invalid Enum Values Accepted via Intake Webhooks — State Corruption |
| PEN-010 | Medium | Stored XSS via Unescaped Text Fields |
| PEN-011 | Medium | Unvalidated `page`/`limit` Parameters — Integer Parsing Edge Cases |
| PEN-012 | Medium | No CORS Policy — Cross-Origin Requests Unrestricted |
| PEN-013 | Medium | `/api/search` Route Unimplemented — 404 + Future Injection Surface |
| PEN-014 | Medium | Internal Error Messages Leaked to Clients |
| PEN-015 | Low | Predictable Sequential Document IDs — Information Disclosure |
| PEN-016 | Low | No Input Length Validation on Text Fields — Payload Amplification |

### Key Theme
The application has **zero authentication** across all 15+ endpoints — this is the foundational vulnerability that enables every other finding. The state machine bypass (PEN-002/PEN-003) is the most business-critical finding: any anonymous actor can route any work item to `approved` status in one HTTP call, completely bypassing the four-role assessment pod.
