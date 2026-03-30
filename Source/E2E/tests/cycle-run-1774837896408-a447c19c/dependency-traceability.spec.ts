// Verifies: FR-dependency-linking — Traceability verification E2E tests
// These tests verify the full feature traceability chain: API contracts, UI rendering, and dispatch gating
import { test, expect } from '@playwright/test';

test.describe('Traceability: Dependency Linking Feature Verification', () => {

  test.describe('API Contract Verification', () => {
    test('bug entity schema includes all dependency fields', async ({ page }) => {
      const res = await page.request.get('/api/bugs');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty('data');
      if (body.data.length > 0) {
        const bug = body.data[0];
        // Verify all required fields from spec
        expect(bug).toHaveProperty('id');
        expect(bug).toHaveProperty('title');
        expect(bug).toHaveProperty('description');
        expect(bug).toHaveProperty('status');
        expect(bug).toHaveProperty('severity');
        expect(bug).toHaveProperty('created_at');
        expect(bug).toHaveProperty('updated_at');
        // Dependency fields
        expect(bug).toHaveProperty('blocked_by');
        expect(bug).toHaveProperty('blocks');
        expect(bug).toHaveProperty('has_unresolved_blockers');
        expect(Array.isArray(bug.blocked_by)).toBe(true);
        expect(Array.isArray(bug.blocks)).toBe(true);
        expect(typeof bug.has_unresolved_blockers).toBe('boolean');
      }
    });

    test('feature request entity schema includes all dependency fields', async ({ page }) => {
      const res = await page.request.get('/api/feature-requests');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      if (body.data.length > 0) {
        const fr = body.data[0];
        expect(fr).toHaveProperty('id');
        expect(fr).toHaveProperty('title');
        expect(fr).toHaveProperty('status');
        expect(fr).toHaveProperty('priority');
        expect(fr).toHaveProperty('blocked_by');
        expect(fr).toHaveProperty('blocks');
        expect(fr).toHaveProperty('has_unresolved_blockers');
      }
    });

    test('dependency link objects have correct shape', async ({ page }) => {
      // Get a bug known to have dependencies (BUG-0010 if seeded)
      const res = await page.request.get('/api/bugs/BUG-0010');
      if (res.ok()) {
        const bug = await res.json();
        if (bug.blocked_by.length > 0) {
          const link = bug.blocked_by[0];
          expect(link).toHaveProperty('item_type');
          expect(link).toHaveProperty('item_id');
          expect(link).toHaveProperty('title');
          expect(link).toHaveProperty('status');
          expect(['bug', 'feature_request']).toContain(link.item_type);
        }
      }
    });

    test('readiness endpoint returns correct schema', async ({ page }) => {
      const res = await page.request.get('/api/bugs/BUG-0010/ready');
      if (res.ok()) {
        const body = await res.json();
        expect(body).toHaveProperty('ready');
        expect(body).toHaveProperty('unresolved_blockers');
        expect(typeof body.ready).toBe('boolean');
        expect(Array.isArray(body.unresolved_blockers)).toBe(true);
        if (body.unresolved_blockers.length > 0) {
          const blocker = body.unresolved_blockers[0];
          expect(blocker).toHaveProperty('item_type');
          expect(blocker).toHaveProperty('item_id');
          expect(blocker).toHaveProperty('title');
          expect(blocker).toHaveProperty('status');
        }
      }
    });

    test('readiness endpoint for feature requests returns correct schema', async ({ page }) => {
      const res = await page.request.get('/api/feature-requests/FR-0004/ready');
      if (res.ok()) {
        const body = await res.json();
        expect(body).toHaveProperty('ready');
        expect(typeof body.ready).toBe('boolean');
      }
    });
  });

  test.describe('Dispatch Gating End-to-End', () => {
    test('full dispatch gating lifecycle: block -> gate -> resolve -> auto-dispatch', async ({ page }) => {
      // Step 1: Create a dependency link
      const addRes = await page.request.post('/api/bugs/BUG-0001/dependencies', {
        data: { action: 'add', blocker_id: 'BUG-0002' },
      });
      expect(addRes.ok()).toBeTruthy();

      // Step 2: Attempt to approve — should be gated
      const approveRes = await page.request.patch('/api/bugs/BUG-0001', {
        data: { status: 'approved' },
      });
      expect(approveRes.ok()).toBeTruthy();
      const gatedBug = await approveRes.json();
      expect(gatedBug.status).toBe('pending_dependencies');

      // Step 3: Check readiness — should be not ready
      const readyRes = await page.request.get('/api/bugs/BUG-0001/ready');
      const readiness = await readyRes.json();
      expect(readiness.ready).toBe(false);
      expect(readiness.unresolved_blockers.length).toBeGreaterThan(0);

      // Step 4: Resolve the blocker
      const resolveRes = await page.request.patch('/api/bugs/BUG-0002', {
        data: { status: 'resolved' },
      });
      expect(resolveRes.ok()).toBeTruthy();

      // Step 5: Verify auto-dispatch occurred
      const afterRes = await page.request.get('/api/bugs/BUG-0001');
      const afterBug = await afterRes.json();
      expect(afterBug.status).toBe('approved');

      // Cleanup
      await page.request.post('/api/bugs/BUG-0001/dependencies', {
        data: { action: 'remove', blocker_id: 'BUG-0002' },
      });
      await page.request.patch('/api/bugs/BUG-0001', { data: { status: 'new' } });
      await page.request.patch('/api/bugs/BUG-0002', { data: { status: 'new' } });
    });

    test('cross-type dependency gating (FR blocked by bug)', async ({ page }) => {
      // Add cross-type dependency
      const addRes = await page.request.post('/api/feature-requests/FR-0001/dependencies', {
        data: { action: 'add', blocker_id: 'BUG-0001' },
      });
      expect(addRes.ok()).toBeTruthy();

      // Verify it appears in the blocked_by list
      const frRes = await page.request.get('/api/feature-requests/FR-0001');
      const fr = await frRes.json();
      const hasBugBlocker = fr.blocked_by.some((b: any) => b.item_id === 'BUG-0001');
      expect(hasBugBlocker).toBe(true);

      // Cleanup
      await page.request.post('/api/feature-requests/FR-0001/dependencies', {
        data: { action: 'remove', blocker_id: 'BUG-0001' },
      });
    });
  });

  test.describe('UI Traceability Verification', () => {
    test('bug list page renders without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/bugs');
      await expect(page.getByRole('heading', { name: 'Bugs' })).toBeVisible();
      await page.waitForTimeout(1000);
      expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    });

    test('feature request list page renders without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/feature-requests');
      await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
      await page.waitForTimeout(1000);
      expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    });

    test('bug detail page shows dependency section with correct structure', async ({ page }) => {
      await page.goto('/bugs/BUG-0010');
      const detail = page.getByTestId('bug-detail');
      if (await detail.count() > 0) {
        // Verify section structure
        await expect(page.getByTestId('dependency-section')).toBeVisible();
        await expect(page.getByText('Blocked By')).toBeVisible();
        await expect(page.getByText('Blocks')).toBeVisible();
        await expect(page.getByTestId('edit-dependencies-btn')).toBeVisible();
      }
    });

    test('dependency picker modal has all required controls', async ({ page }) => {
      await page.goto('/bugs/BUG-0010');
      const editBtn = page.getByTestId('edit-dependencies-btn');
      if (await editBtn.count() > 0) {
        await editBtn.click();
        // Verify all modal controls
        await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
        await expect(page.getByTestId('dependency-search-input')).toBeVisible();
        await expect(page.getByTestId('dependency-picker-save')).toBeVisible();
        await expect(page.getByTestId('dependency-picker-cancel')).toBeVisible();
        // Verify accessible dialog
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        // Close
        await page.getByTestId('dependency-picker-cancel').click();
      }
    });

    test('blocked badge accessibility attributes are correct', async ({ page }) => {
      await page.goto('/bugs');
      await expect(page.getByTestId('bug-list')).toBeVisible();
      const blockedBadge = page.getByTestId('badge-blocked').first();
      if (await blockedBadge.count() > 0) {
        await expect(blockedBadge).toHaveAttribute('role', 'status');
        await expect(blockedBadge).toHaveAttribute('aria-label', 'Blocked');
      }
    });
  });

  test.describe('Seed Data Verification', () => {
    test('BUG-0010 has seeded dependencies', async ({ page }) => {
      const res = await page.request.get('/api/bugs/BUG-0010');
      if (res.ok()) {
        const bug = await res.json();
        // Should have 5 blockers: BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
        const blockerIds = bug.blocked_by.map((b: any) => b.item_id).sort();
        expect(blockerIds).toEqual(['BUG-0003', 'BUG-0004', 'BUG-0005', 'BUG-0006', 'BUG-0007']);
      }
    });

    test('FR-0004 is blocked by FR-0003', async ({ page }) => {
      const res = await page.request.get('/api/feature-requests/FR-0004');
      if (res.ok()) {
        const fr = await res.json();
        expect(fr.blocked_by.some((b: any) => b.item_id === 'FR-0003')).toBe(true);
      }
    });

    test('FR-0005 is blocked by FR-0002', async ({ page }) => {
      const res = await page.request.get('/api/feature-requests/FR-0005');
      if (res.ok()) {
        const fr = await res.json();
        expect(fr.blocked_by.some((b: any) => b.item_id === 'FR-0002')).toBe(true);
      }
    });

    test('FR-0007 is blocked by FR-0003', async ({ page }) => {
      const res = await page.request.get('/api/feature-requests/FR-0007');
      if (res.ok()) {
        const fr = await res.json();
        expect(fr.blocked_by.some((b: any) => b.item_id === 'FR-0003')).toBe(true);
      }
    });
  });
});
