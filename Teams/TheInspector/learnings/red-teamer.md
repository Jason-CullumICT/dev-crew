# Red Teamer Learnings — TheInspector

## Run: run-20260330-071418
**Feature audited:** duplicate/deprecated status tagging (FR-DUP-*)

---

### Patterns Observed

#### Properly Defended
- **SQL injection**: All service-layer queries use parameterized statements (`db.prepare(...).run(...params)` / `.all(...params)`). No raw string interpolation of user input into SQL.
- **XSS via deprecation_reason**: React JSX auto-escapes all string interpolation inside JSX text nodes. `{fr.deprecation_reason}` renders safely. No `dangerouslySetInnerHTML` is used anywhere in the changed files.
- **Self-referential duplicate**: Both `bugService.ts` and `featureRequestService.ts` explicitly check `if (input.duplicate_of === id)` and throw 400. Blocked.
- **Nonexistent duplicate_of**: Both services validate the canonical item exists in the DB before accepting the reference. Blocked.
- **Cross-type duplicate_of**: `bugService.ts` queries `bugs` table; `featureRequestService.ts` queries `feature_requests` table. A bug cannot reference an FR ID and vice versa.
- **Circular duplicate chains** (A→B, B→A): Both A and B would have status `duplicate` (terminal). Terminal status enforcement means B cannot transition from `duplicate` to `duplicate` again pointing back to A — `STATUS_TRANSITIONS['duplicate'] = []` for FRs, and the bug service throws "terminal status" for any transition out of `duplicate`. Not possible.
- **Hidden status bypass via GET /:id**: The individual GET endpoints (`getBugById`, `getFeatureRequestById`) do NOT filter by hidden status, meaning anyone can GET a specific hidden item by ID. This is by design but worth noting — it is an intentional detail view disclosure.

#### Vulnerable Patterns
- **No authentication or authorization whatsoever**: The portal backend has zero auth middleware. Any anonymous HTTP client can read, create, update, or delete any item. This includes marking items duplicate/deprecated.
- **`include_hidden` bypass via query parameter**: The `include_hidden` flag is controlled 100% by the client — any caller can pass `?include_hidden=true` to bypass the default hidden-item filter, or use the status filter to explicitly filter for `?status=duplicate` items.
- **`deprecation_reason` length unchecked**: The `deprecation_reason` field has no maximum length validation in either service. An attacker could store an arbitrarily long string (constrained only by SQLite defaults).
- **`status` filter allows explicit duplicate/deprecated enumeration**: Even without `include_hidden=true`, passing `?status=duplicate&include_hidden=false` produces an empty set (filtered out by NOT IN), but `?status=duplicate&include_hidden=true` returns all duplicate items. The `include_hidden` gate works correctly, but since there is no auth, any caller can use it.

---

### File Paths to Critical Code (for future audits)
- Auth: `/workspace/portal/Backend/src/index.ts` — no auth middleware registered
- FR status transitions: `/workspace/portal/Backend/src/services/featureRequestService.ts:37-47`
- Bug terminal status guard: `/workspace/portal/Backend/src/services/bugService.ts:224-226`
- Hidden-status filter: `bugService.ts:94-97`, `featureRequestService.ts:170-173`
- Duplicate validation: `bugService.ts:229-240`, `featureRequestService.ts:299-313`
- XSS rendering: `FeatureRequestDetail.tsx:236`, `BugDetail.tsx:191` — JSX text nodes, safe

---

### Domain-Specific Security Patterns
- Terminal status (`duplicate`, `deprecated`) enforcement is implemented at the service layer (not route layer) — correct architecture per project rules.
- `duplicate_of` is validated for same-entity-type references only. Cross-type is structurally impossible.
- `deprecation_reason` max length should be added to match the `DESCRIPTION_MAX_LENGTH` pattern used elsewhere.
- The portal is explicitly an internal debug tool (not customer-facing), but auth is still absent — document whether this is an accepted design decision or a gap.
