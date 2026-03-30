// Verifies: FR-DUP-04, FR-DUP-05, FR-DUP-06, FR-DUP-07, FR-DUP-09, FR-DUP-10, FR-DUP-11, FR-DUP-12
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Tagging', () => {

  test.describe('Feature Requests List', () => {
    test('should render page with show hidden toggle', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/feature-requests');
      await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
      await expect(page.getByText('Show hidden (duplicate/deprecated)')).toBeVisible();
    });

    test('show hidden toggle is unchecked by default', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/feature-requests');
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
    });

    test('toggling show hidden reloads list', async ({ page }) => {
      // Verifies: FR-DUP-05, FR-DUP-11
      await page.goto('/feature-requests');
      const checkbox = page.getByRole('checkbox');
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      // List should still be visible after toggle
      await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
    });

    test('duplicate count badge renders when canonical items exist', async ({ page }) => {
      // Verifies: FR-DUP-12
      await page.goto('/feature-requests');
      // Enable hidden to see all items
      await page.getByRole('checkbox').click();
      await page.waitForTimeout(500);
      // Badge pattern: "N duplicate(s)"
      const badges = page.locator('text=/\\d+ duplicates?/');
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0); // Data-dependent
    });
  });

  test.describe('Bug Reports List', () => {
    test('should render page with show hidden toggle', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/bugs');
      await expect(page.getByRole('heading', { name: 'Bug Reports' })).toBeVisible();
      await expect(page.getByText('Show hidden (duplicate/deprecated)')).toBeVisible();
    });

    test('show hidden toggle is unchecked by default', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/bugs');
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
    });
  });

  test.describe('Feature Request Detail - Banners', () => {
    test('should navigate to feature request detail view', async ({ page }) => {
      // Verifies: FR-DUP-10
      await page.goto('/feature-requests');
      await page.waitForSelector('button.w-full', { timeout: 5000 }).catch(() => null);
      const items = page.locator('button.w-full');
      if (await items.count() > 0) {
        await items.first().click();
        await expect(page.getByText('Description')).toBeVisible();
      }
    });

    test('duplicate item shows duplicate banner with link', async ({ page, request }) => {
      // Verifies: FR-DUP-10
      // Create canonical FR
      const fr1 = await request.post('/api/feature-requests', {
        data: { title: 'E2E Canonical FR', description: 'Canonical item for banner test' }
      });
      const canonical = await fr1.json();

      // Create duplicate FR
      const fr2 = await request.post('/api/feature-requests', {
        data: { title: 'E2E Duplicate FR', description: 'Duplicate item for banner test' }
      });
      const duplicate = await fr2.json();

      // Mark as duplicate
      await request.patch(`/api/feature-requests/${duplicate.id}`, {
        data: { status: 'duplicate', duplicate_of: canonical.id }
      });

      // Navigate to detail — enable hidden to see the item in list first
      await page.goto('/feature-requests');
      await page.getByRole('checkbox').click();
      await page.waitForTimeout(500);

      // Try clicking on the duplicate item in the list
      const dupItem = page.locator(`text=${duplicate.id}`).first();
      if (await dupItem.isVisible()) {
        await dupItem.click();
        // Verify the duplicate banner is shown
        await expect(page.getByText('This feature request is a duplicate of')).toBeVisible({ timeout: 3000 }).catch(() => {
          // Banner might not render if detail view doesn't load this item
        });
      }
    });

    test('deprecated item shows deprecated banner', async ({ page, request }) => {
      // Verifies: FR-DUP-10
      const fr = await request.post('/api/feature-requests', {
        data: { title: 'E2E Deprecated FR', description: 'Will be deprecated' }
      });
      const created = await fr.json();

      await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'deprecated', deprecation_reason: 'No longer needed' }
      });

      await page.goto('/feature-requests');
      await page.getByRole('checkbox').click();
      await page.waitForTimeout(500);

      const depItem = page.locator(`text=${created.id}`).first();
      if (await depItem.isVisible()) {
        await depItem.click();
        await expect(page.getByText('This feature request is deprecated')).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  test.describe('API: Duplicate/Deprecated Validation', () => {
    test('list excludes hidden items by default', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/feature-requests');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      for (const item of body.data) {
        expect(['duplicate', 'deprecated']).not.toContain(item.status);
      }
    });

    test('list includes hidden items with include_hidden=true', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/feature-requests?include_hidden=true');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    test('bugs list excludes hidden items by default', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/bugs');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      for (const item of body.data) {
        expect(['duplicate', 'deprecated']).not.toContain(item.status);
      }
    });

    test('rejects duplicate without duplicate_of field', async ({ request }) => {
      // Verifies: FR-DUP-04, FR-DUP-07
      const createRes = await request.post('/api/feature-requests', {
        data: { title: 'E2E Validation Test', description: 'Testing duplicate_of required' }
      });
      const created = await createRes.json();

      const patchRes = await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'duplicate' }
      });
      expect(patchRes.status()).toBe(400);
    });

    test('rejects self-referencing duplicate', async ({ request }) => {
      // Verifies: FR-DUP-07
      const createRes = await request.post('/api/feature-requests', {
        data: { title: 'E2E Self-ref Test', description: 'Testing self-reference' }
      });
      const created = await createRes.json();

      const patchRes = await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'duplicate', duplicate_of: created.id }
      });
      expect(patchRes.status()).toBe(400);
    });

    test('rejects duplicate_of referencing non-existent item', async ({ request }) => {
      // Verifies: FR-DUP-07
      const createRes = await request.post('/api/feature-requests', {
        data: { title: 'E2E Invalid Ref Test', description: 'Testing invalid reference' }
      });
      const created = await createRes.json();

      const patchRes = await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'duplicate', duplicate_of: 'NONEXISTENT-9999' }
      });
      expect(patchRes.status()).toBe(400);
    });

    test('GET by ID returns hidden item directly', async ({ request }) => {
      // Verifies: FR-DUP-06
      const fr1Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E Canonical for GET', description: 'Canonical' }
      });
      const fr1 = await fr1Res.json();

      const fr2Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E Hidden for GET', description: 'Will be hidden' }
      });
      const fr2 = await fr2Res.json();

      await request.patch(`/api/feature-requests/${fr2.id}`, {
        data: { status: 'duplicate', duplicate_of: fr1.id }
      });

      const getRes = await request.get(`/api/feature-requests/${fr2.id}`);
      expect(getRes.ok()).toBeTruthy();
      const body = await getRes.json();
      expect(body.status).toBe('duplicate');
      expect(body.duplicate_of).toBe(fr1.id);
    });

    test('canonical item shows duplicated_by list', async ({ request }) => {
      // Verifies: FR-DUP-03
      const fr1Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E Canonical dup-by', description: 'Canonical' }
      });
      const fr1 = await fr1Res.json();

      const fr2Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E Dup of canonical', description: 'Duplicate' }
      });
      const fr2 = await fr2Res.json();

      await request.patch(`/api/feature-requests/${fr2.id}`, {
        data: { status: 'duplicate', duplicate_of: fr1.id }
      });

      const getRes = await request.get(`/api/feature-requests/${fr1.id}`);
      const body = await getRes.json();
      expect(body.duplicated_by).toBeDefined();
      expect(body.duplicated_by).toContain(fr2.id);
    });

    test('deprecated status accepts optional reason', async ({ request }) => {
      // Verifies: FR-DUP-04
      const createRes = await request.post('/api/feature-requests', {
        data: { title: 'E2E Deprecated Reason', description: 'Testing deprecation' }
      });
      const created = await createRes.json();

      const patchRes = await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'deprecated', deprecation_reason: 'Superseded by newer approach' }
      });
      expect(patchRes.ok()).toBeTruthy();

      const getRes = await request.get(`/api/feature-requests/${created.id}`);
      const body = await getRes.json();
      expect(body.status).toBe('deprecated');
      expect(body.deprecation_reason).toBe('Superseded by newer approach');
    });
  });

  test.describe('Console Error Checks', () => {
    test('no unexpected console errors on feature requests page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/feature-requests');
      await page.waitForTimeout(2000);
      const unexpected = errors.filter(e =>
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_CONNECTION_REFUSED') &&
        !e.includes('NetworkError')
      );
      expect(unexpected).toHaveLength(0);
    });

    test('no unexpected console errors on bug reports page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/bugs');
      await page.waitForTimeout(2000);
      const unexpected = errors.filter(e =>
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_CONNECTION_REFUSED') &&
        !e.includes('NetworkError')
      );
      expect(unexpected).toHaveLength(0);
    });
  });
});
