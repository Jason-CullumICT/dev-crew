Based on my analysis of the codebase, I've identified the issue and scope. Let me produce a structured fix plan:

## Fix Plan: Implement Missing Search Endpoint with Special Character Handling

### **Root Cause Analysis**

The bug report refers to `GET /api/search?q=` endpoint that is **not yet implemented** in the Source/Backend application:

1. **Test Contract Exists**: `Source/Backend/tests/routes/search.test.ts` documents the expected behavior, with a note at the top saying "the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts"
2. **Frontend Expects It**: `Source/Frontend/src/api/client.ts` line 101-104 calls `searchItems(q)` which hits `/api/search`
3. **Route Not Wired**: `Source/Backend/src/app.ts` has no import or route registration for search
4. **Special Characters**: The in-memory store uses simple string matching; special characters (%, _, [) won't cause issues if implemented correctly

### **Scope Tag: `backend-only`**

**Justification:**
- Changes are entirely in `Source/Backend/src/` (routes, store)
- Shared types (`Source/Shared/types/workflow.ts`) need no modifications
- Frontend client code already exists and is correct
- No frontend components need changes

---

## Issues to Fix

| # | Issue | Root Cause | Files | Priority |
|---|-------|-----------|-------|----------|
| 1 | Search route not implemented | Route handler missing | `Source/Backend/src/routes/search.ts` (create) | P0 |
| 2 | Search store function missing | No search method in store | `Source/Backend/src/store/workItemStore.ts` (add method) | P0 |
| 3 | Search router not registered | Route not wired in app | `Source/Backend/src/app.ts` (add import + route) | P0 |
| 4 | Special characters not escaped | Need safe string matching (no regex injection) | `Source/Backend/src/store/workItemStore.ts` (search impl) | P0 |

---

## Implementation Plan

### **Phase 1: Store Layer** 
Add search function to `workItemStore.ts` that:
- Accepts a query string `q`
- Returns matching WorkItems by title/description (case-insensitive)
- Handles special characters safely using `.includes()` or `.toLowerCase().includes(q.toLowerCase())`
- Excludes deleted items
- Returns `{ data: WorkItem[] }` wrapper

### **Phase 2: Route Handler**
Create `Source/Backend/src/routes/search.ts` that:
- Exports Router with `GET /` handler
- Calls `store.search(q)` 
- Handles empty query → returns empty array
- Returns properly formatted response: `{ data: [...] }`
- Includes error handling and logging

### **Phase 3: Wire Routes**
Update `Source/Backend/src/app.ts` to:
- Import search router
- Register at `app.use('/api/search', searchRouter)`

### **Phase 4: Verify Tests**
Run `npm test --workspace=Source/Backend` to confirm all search tests pass:
- ✅ Query returns matching items (title + description)
- ✅ Empty query returns empty array
- ✅ Results from multiple types
- ✅ Deleted items excluded
- ✅ Special characters handled safely (%, _, [)

---

## Files to Modify

| File | Change | Type |
|------|--------|------|
| `Source/Backend/src/routes/search.ts` | Create new route handler | **Create** |
| `Source/Backend/src/store/workItemStore.ts` | Add `search(q: string)` function | **Edit** |
| `Source/Backend/src/app.ts` | Import + register search router | **Edit** |

---

## Verification Gates

Before marking complete:
1. Run `npm test --workspace=Source/Backend` — all search tests pass
2. No new test failures in other routes/store tests
3. Special character tests work (if tests include them)
4. Response format matches `{ data: WorkItem[] }` pattern

---

## Only Fixer Needed

- **backend-fixer**: Implement search route + store function + wire app.ts
- frontend-fixer: **Skip** (no frontend changes)

This is a **pure backend feature gap** with no cross-layer dependencies or type changes.
