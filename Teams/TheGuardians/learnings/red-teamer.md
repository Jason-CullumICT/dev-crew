# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-08-03 — Source/Backend Red Team

### Environment Notes
- `docker-compose.test.yml` spins up the **portal** backend (different codebase — `/api/feature-requests`, `/api/bugs`, etc.) on port 3001. This is NOT what the pen-tester analyzes.
- The pen-tester targets `Source/Backend/` which exposes `/api/work-items`, `/api/intake`, `/api/dashboard`.
- To run Source/Backend for red-team testing: compile with `npm run build` then start with a module-path shim for `@shared/*` alias:
  ```bash
  cd Source/Backend
  npm run build
  cat > /tmp/start-source-backend.js << 'EOF'
  const Module = require('module');
  const orig = Module._resolveFilename;
  Module._resolveFilename = function(req, parent, isMain, options) {
    if (req.startsWith('@shared/')) req = req.replace('@shared/', '/path/to/Source/Backend/dist/Shared/');
    return orig.call(this, req, parent, isMain, options);
  };
  const app = require('./dist/Backend/src/app.js');
  (app.default || app).listen(process.env.PORT || 3099, () => console.log('up'));
  EOF
  PORT=3099 node /tmp/start-source-backend.js &
  ```
- `require.main === module` guard in app.ts prevents listen when required from a wrapper; must call `listen()` explicitly.
- The `POST /api/work-items` endpoint requires `source` field — valid values: `browser`, `zendesk`, `manual`, `automated`.

### Confirmed Exploit Chains

#### CHAIN A (Critical) — PEN-001 + PEN-002: Full Assessment Bypass
- Zero auth on all endpoints confirmed.
- Flow: `POST /api/work-items` (source=manual) → `POST /:id/route` → `POST /:id/approve` ({"reason":"..."}) → `POST /:id/dispatch` ({"team":"TheATeam"})
- Result: item dispatched to `in-progress` with `agent: manual-override` — assessment pod never in history.
- **Key evidence:** changeHistory agent list never contains `assessment-pod`.

#### CHAIN B (Critical) — PEN-001 + PEN-005: Fast-Track Override
- `POST /:id/route` with `{"overrideRoute":"fast-track"}` → feature item jumps directly to `approved`.
- Arbitrary strings in `overrideRoute` (e.g., `"ARBITRARY_INVALID_ROUTE_XYZ"`) stored verbatim in `item.route` field.
- Precondition: item must be in `backlog` status.

#### CHAIN C (High) — PEN-003: Uncapped Pagination Dump
- `GET /api/work-items?limit=999999999` dumps all items. `limit=0` and `limit=abc` (NaN) fall back to default (20), not zero.
- Response includes `changeHistory[]`, `assessments[]`, full internal state.

#### CHAIN D (High) — PEN-004: Intake Type/Priority Pollution
- `POST /api/intake/zendesk` accepts ANY string for `type` and `priority` — no enum validation.
- `__proto__` and `constructor` stored verbatim. Dashboard `priorityCounts` confirms `"constructor"` key present.
- Prometheus metrics permanently polluted with injected label values for process lifetime.
- 500-char strings accepted without error.

#### CHAIN E (High) — PEN-009: Stored XSS via Reject Reason
- `POST /:id/reject` with `{"reason":"<script>...</script><img src=x onerror=...>"}` → stored verbatim.
- Payload appears in `GET /api/dashboard/activity` response — confirmed in `data[].reason`.
- Need shell-escaped JSON (use python3 to generate payload JSON) to avoid shell escaping issues.

#### CHAIN F (High) — PEN-011: Permanent DoS via Soft-Deleted Blocker
- Flow: create A + B → approve both → `POST /A/dependencies {"action":"add","blockerId":"B"}` → `DELETE /B` → `POST /A/dispatch` → permanent HTTP 400
- `DELETE` does not trigger `onItemResolved()` cascade — blocker entry persists in A's `blockedBy`.
- No recovery without manual `PATCH` or `POST /A/dependencies {"action":"remove","blockerId":"B"}`.

#### CHAIN G (High) — PEN-007: Webhook Flooding
- 50/50 requests to `POST /api/intake/zendesk` accepted, including with fake `X-Zendesk-Webhook-Signature` header.
- No rate limiting, no HMAC validation.

#### CHAIN H (Medium) — PEN-006: CORS Absent
- No `Access-Control-Allow-Origin` header in any response (including OPTIONS preflight).
- `X-Powered-By: Express` present — version fingerprinting possible.

#### CHAIN I (Medium) — PEN-008: Metrics Exposure
- `GET /metrics` returns full Prometheus text with operational counters, team dispatch targets, heap/CPU stats.
- Injected `__proto__` and 500-char type labels persist in metric counters permanently.

### Dead Ends / Not Exploitable

- **PEN-014 (PATCH allowlist):** Current PATCH handler correctly restricts to `['title','description','type','priority','complexity']`. `status`, `id`, `deleted` overrides ignored. Safe in current call sites.
- **PEN-013 (Repeated assess):** Item moves from `proposed` → `reviewing` → `approved/rejected` in a single synchronous call. After rejection, `route` endpoint rejects re-routing (requires `backlog`). Linear loop not achievable. Concurrent race not tested.

### Sequential DocId Behavior
- First item: `WI-001`. The N in `WI-N` reveals exactly how many items were created before yours.
- Counter is module-level, not reset between tests. After a large flood (50 zendesk spams), docId jumped to WI-066.

### Useful curl Patterns
```bash
# Create item with all required fields
curl -s -X POST http://localhost:3099/api/work-items \
  -H "Content-Type: application/json" \
  -d '{"title":"t","description":"d","type":"bug","priority":"low","source":"manual"}'

# Inject XSS payload safely (avoids shell escaping issues)
XSS_JSON=$(python3 -c "import json; print(json.dumps({'reason': '<script>alert(1)</script>'}))")
curl -s -X POST http://localhost:3099/api/work-items/$ID/reject -H "Content-Type: application/json" -d "$XSS_JSON"

# Full data dump (no cap)
curl -s "http://localhost:3099/api/work-items?limit=999999999"
```
