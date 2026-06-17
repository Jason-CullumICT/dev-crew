Based on my analysis of the codebase, here is the **FIX PLAN** for the image delete ownership verification bug:

---

## 🔴 SECURITY BUG: Cross-Entity Image Deletion

**Severity:** HIGH (Authorization bypass)

### Root Cause Analysis

The image delete endpoint in both `portal/Backend/src/routes/bugs.ts` and `portal/Backend/src/routes/featureRequests.ts` (DELETE `/:id/images/:imageId`) extracts the entity ID from the URL path but **never validates that the image belongs to that entity** before deletion.

**Vulnerable Code:**
- **bugs.ts line 204-212:** Route extracts `:id` and `:imageId` but calls `deleteImage(getDb(), imageId)` without verifying ownership
- **featureRequests.ts line 329-337:** Same pattern
- **imageService.ts line 119-144:** `deleteImage()` function only queries by `imageId`, doesn't check `entity_id` or `entity_type`

**Attack Vector:**
```
1. Attacker uploads image to BUG-001 → IMG-0001 is created
2. Attacker learns IMG ID of someone else's Feature Request (IMG-0005 → FR-123)
3. Attacker sends: DELETE /api/bugs/BUG-001/images/IMG-0005
4. Endpoint deletes IMG-0005 despite it belonging to FR-123
```

---

## 📋 Fix Plan

### **Issue 1: imageService.ts — deleteImage() lacks ownership verification**

**File:** `portal/Backend/src/services/imageService.ts`

**Current Problem (lines 119-144):**
- Function signature: `deleteImage(db: Database.Database, imageId: string): void`
- Only queries: `SELECT * FROM image_attachments WHERE id = ?`
- Missing entity ownership check

**Fix:**
1. Update function signature to accept `entityId` and `entityType` parameters
2. Query image AND validate it belongs to the specified entity
3. Throw 403 Forbidden if mismatch detected (not 404)
4. Update logging to include entity context

**Test Coverage Needed:**
- ✅ Verify deletion succeeds for correct entity
- ✅ Verify 403 response when image belongs to different entity
- ✅ Verify 403 response when image belongs to different entity type

---

### **Issue 2: bugs.ts — DELETE route doesn't verify image ownership**

**File:** `portal/Backend/src/routes/bugs.ts`

**Current Problem (lines 204-212):**
```typescript
router.delete('/:id/images/:imageId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;
    deleteImage(getDb(), imageId);  // ← BUG: ignores :id parameter
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

**Fix:**
1. Extract `:id` parameter (bug entity ID)
2. Pass `id` and `'bug'` to `deleteImage()` function
3. Handle 403 Forbidden response from service

**Test Coverage Needed:**
- ✅ Prevent deletion of images belonging to Feature Requests
- ✅ Verify 403 when attempting cross-entity deletion

---

### **Issue 3: featureRequests.ts — DELETE route doesn't verify image ownership**

**File:** `portal/Backend/src/routes/featureRequests.ts`

**Current Problem (lines 329-337):** Identical pattern as bugs.ts

**Fix:** Same as Issue 2 (pass `id` and `'feature_request'` to `deleteImage()`)

---

### **Issue 4: imageService.test.ts — Missing cross-entity deletion tests**

**File:** `portal/Backend/tests/imageService.test.ts`

**Test Coverage Gaps:**
- No test validates rejection of cross-entity deletion

**New Tests Needed:**
```typescript
describe('Image Service — deleteImage ownership validation', () => {
  it('should reject deletion if image belongs to different entity', () => {
    // Create FR-123 with IMG-0001
    // Create BUG-001
    // Call deleteImage(db, 'IMG-0001', 'BUG-001', 'bug')
    // Should throw 403 error: "Image does not belong to this entity"
  });
});
```

---

### **Issue 5: imageRoutes.test.ts — Missing cross-entity deletion tests**

**File:** `portal/Backend/tests/imageRoutes.test.ts`

**New Tests Needed:**

For bugs.ts:
```typescript
it('should return 403 when attempting to delete image from wrong entity', async () => {
  const fr = createFeatureRequest(db, { title: 'FR', description: 'desc' });
  const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });
  const app = createApp();
  
  // Upload image to FR
  const uploadRes = await supertest(app)
    .post(`/api/feature-requests/${fr.id}/images`)
    .attach('images', createSmallPng(), 'test.png');
  const imageId = uploadRes.body.data[0].id;
  
  // Attempt to delete via bug endpoint
  const deleteRes = await supertest(app)
    .delete(`/api/bugs/${bug.id}/images/${imageId}`);
  
  expect(deleteRes.status).toBe(403);
  expect(deleteRes.body.error).toContain('does not belong');
});
```

Similar test for featureRequests.ts.

---

## 📊 Scope & Assignment

| Component | File | Scope | Status |
|-----------|------|-------|--------|
| Service Layer | `portal/Backend/src/services/imageService.ts` | backend-only | ❌ Needs fix |
| Route Handler | `portal/Backend/src/routes/bugs.ts` | backend-only | ❌ Needs fix |
| Route Handler | `portal/Backend/src/routes/featureRequests.ts` | backend-only | ❌ Needs fix |
| Service Tests | `portal/Backend/tests/imageService.test.ts` | backend-only | ❌ Needs tests |
| Route Tests | `portal/Backend/tests/imageRoutes.test.ts` | backend-only | ❌ Needs tests |
| Shared Types | `portal/Shared/types.ts` | - | ✅ No changes needed |
| Frontend | `portal/Frontend/` | - | ✅ No changes needed |

---

## 🏷️ Scope Tag

**`backend-only`**

- All changes are in `portal/Backend/` (services, routes, tests)
- No changes to shared types or frontend
- Single agent can implement: **backend-fixer**

---

## ⏱️ Implementation Order

1. **Update service layer** → `deleteImage()` signature + entity validation logic
2. **Update route handlers** → bugs.ts and featureRequests.ts DELETE endpoints
3. **Add service tests** → imageService.test.ts for ownership validation
4. **Add route tests** → imageRoutes.test.ts for cross-entity prevention
5. **Run verification gates** → Ensure all tests pass, no new failures

---

## 🔒 Security Checklist

- [ ] Image deletion validates `entity_id` AND `entity_type` match
- [ ] 403 Forbidden returned for ownership violations (not 404)
- [ ] Error message doesn't leak entity information
- [ ] Cross-entity deletion attempts are logged (security audit trail)
- [ ] Tests verify rejection of cross-entity deletion attempts
- [ ] No silent failures in error handling
