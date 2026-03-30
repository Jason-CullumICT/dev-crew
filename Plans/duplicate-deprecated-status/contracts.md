# API Contracts: Duplicate/Deprecated Status

## Shared Type Changes

### portal/Shared/types.ts

```typescript
// Updated unions
export type FeatureRequestStatus = 'potential' | 'voting' | 'approved' | 'denied' | 'in_development' | 'completed' | 'pending_dependencies' | 'duplicate' | 'deprecated';
export type BugStatus = 'reported' | 'triaged' | 'in_development' | 'resolved' | 'closed' | 'pending_dependencies' | 'duplicate' | 'deprecated';

// Updated constant
export const RESOLVED_STATUSES: readonly string[] = [
  'completed', 'resolved', 'closed', 'duplicate', 'deprecated',
] as const;

// New constant
export const HIDDEN_STATUSES: readonly string[] = [
  'duplicate', 'deprecated',
] as const;

// FeatureRequest — add 3 fields:
interface FeatureRequest {
  // ... existing fields ...
  duplicate_of: string | null;       // FR-XXXX of canonical item, null if not duplicate
  deprecation_reason: string | null; // reason string, null if not deprecated
  duplicated_by: string[];           // computed: IDs of items that are duplicates of this one
}

// BugReport — add 3 fields:
interface BugReport {
  // ... existing fields ...
  duplicate_of: string | null;       // BUG-XXXX of canonical item
  deprecation_reason: string | null;
  duplicated_by: string[];           // computed
}
```

### portal/Shared/api.ts

```typescript
// Updated inputs
export interface UpdateFeatureRequestInput {
  status?: string;
  description?: string;
  priority?: string;
  duplicate_of?: string;          // Required when status='duplicate'
  deprecation_reason?: string;    // Optional when status='deprecated'
}

export interface UpdateBugInput {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  source_system?: string;
  duplicate_of?: string;          // Required when status='duplicate'
  deprecation_reason?: string;    // Optional when status='deprecated'
}
```

## Endpoint Contracts

### PATCH /api/bugs/:id — Mark as Duplicate

**Request:**
```json
{
  "status": "duplicate",
  "duplicate_of": "BUG-0003"
}
```

**Response 200:**
```json
{
  "id": "BUG-0005",
  "status": "duplicate",
  "duplicate_of": "BUG-0003",
  "deprecation_reason": null,
  "duplicated_by": [],
  ...
}
```

**Error 400 — missing duplicate_of:**
```json
{ "error": "duplicate_of is required when status is 'duplicate'" }
```

**Error 400 — self-reference:**
```json
{ "error": "An item cannot be a duplicate of itself" }
```

**Error 400 — not found:**
```json
{ "error": "duplicate_of references non-existent bug: BUG-9999" }
```

### PATCH /api/bugs/:id — Mark as Deprecated

**Request:**
```json
{
  "status": "deprecated",
  "deprecation_reason": "Superseded by new auth system"
}
```

**Response 200:**
```json
{
  "id": "BUG-0005",
  "status": "deprecated",
  "duplicate_of": null,
  "deprecation_reason": "Superseded by new auth system",
  "duplicated_by": [],
  ...
}
```

### PATCH /api/feature-requests/:id — Mark as Duplicate

Same contract as bugs but with FR-XXXX format for `duplicate_of`.

### GET /api/bugs?include_hidden=true

**Default (no param or include_hidden=false):** excludes items with status `duplicate` or `deprecated`.

**With include_hidden=true:** returns all items including duplicate/deprecated.

### GET /api/feature-requests?include_hidden=true

Same behavior as bugs.

### GET /api/bugs/:id (detail) — Canonical Item

Returns the `duplicated_by` field:

```json
{
  "id": "BUG-0003",
  "status": "reported",
  "duplicated_by": ["BUG-0005", "BUG-0007"],
  ...
}
```

## Database Schema

```sql
-- Idempotent migrations (check column exists first)
ALTER TABLE feature_requests ADD COLUMN duplicate_of TEXT;
ALTER TABLE feature_requests ADD COLUMN deprecation_reason TEXT;
ALTER TABLE bugs ADD COLUMN duplicate_of TEXT;
ALTER TABLE bugs ADD COLUMN deprecation_reason TEXT;
```

## Status Transition Rules

- **Any status → duplicate:** Allowed (terminal disposition)
- **Any status → deprecated:** Allowed (terminal disposition)
- **duplicate/deprecated → any other status:** NOT allowed (undoing requires manual cleanup — out of scope for v1)

## Dependency Gating Integration

`duplicate` and `deprecated` are added to `RESOLVED_STATUSES`, meaning:
- Items blocked by a duplicate/deprecated item are unblocked
- `onItemCompleted` cascade fires when an item transitions to these statuses
