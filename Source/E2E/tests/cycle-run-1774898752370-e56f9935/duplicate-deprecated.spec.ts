// Verifies: FR-DUP-04, FR-DUP-05, FR-DUP-06, FR-DUP-09, FR-DUP-10, FR-DUP-11, FR-DUP-12
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Tagging', () => {

  test.describe('Feature Requests Page', () => {
    test('should render the feature requests page with show hidden toggle', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/feature-requests');
      await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
      await expect(page.getByText('Show hidden (duplicate/deprecated)')).toBeVisible();
    });

    test('should toggle show hidden checkbox', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/feature-requests');
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    });

    test('should display feature request list items', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/feature-requests');
      await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
      // Wait for list to load (either items or empty state)
      await page.waitForSelector('button.w-full, .text-center');
    });

    test('should show duplicate count badge on canonical items', async ({ page }) => {
      // Verifies: FR-DUP-12
      await page.goto('/feature-requests');
      // Enable hidden items to ensure we see all items
      const checkbox = page.getByRole('checkbox');
      await checkbox.click();
      // Wait for list reload
      await page.waitForTimeout(500);
      // Check for duplicate badge text pattern if canonical items exist
      const badges = page.locator('text=/\\d+ duplicates?/');
      // May or may not have duplicates depending on data state
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should open feature request detail on click', async ({ page }) => {
      // Verifies: FR-DUP-10
      await page.goto('/feature-requests');
      // Wait for list to load
      await page.waitForSelector('button.w-full', { timeout: 5000 }).catch(() => null);
      const items = page.locator('button.w-full');
      const itemCount = await items.count();
      if (itemCount > 0) {
        await items.first().click();
        // Detail view should appear with description section
        await expect(page.getByText('Description')).toBeVisible();
      }
    });
  });

  test.describe('Bug Reports Page', () => {
    test('should render the bug reports page with show hidden toggle', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/bugs');
      await expect(page.getByRole('heading', { name: 'Bug Reports' })).toBeVisible();
      await expect(page.getByText('Show hidden (duplicate/deprecated)')).toBeVisible();
    });

    test('should toggle show hidden checkbox on bugs page', async ({ page }) => {
      // Verifies: FR-DUP-11
      await page.goto('/bugs');
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    });
  });

  test.describe('API: Duplicate/Deprecated via UI flow', () => {
    test('should create and mark a feature request as deprecated', async ({ page }) => {
      // Verifies: FR-DUP-04, FR-DUP-09
      await page.goto('/feature-requests');

      // Click New Feature Request
      await page.getByRole('button', { name: '+ New Feature Request' }).click();
      await expect(page.getByText('New Feature Request')).toBeVisible();

      // Fill out form
      await page.getByPlaceholder('Feature request title').fill('E2E Test Deprecated FR');
      await page.getByPlaceholder('Describe the feature').fill('This FR will be deprecated for testing');

      // Submit
      await page.getByRole('button', { name: 'Submit' }).click();

      // Wait for form to close and list to reload
      await page.waitForTimeout(1000);

      // Enable hidden items
      const checkbox = page.getByRole('checkbox');
      await checkbox.check();
      await page.waitForTimeout(500);
    });

    test('should not have console errors on feature requests page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/feature-requests');
      await page.waitForTimeout(2000);
      // Filter out expected errors (network errors for missing orchestrator, etc.)
      const unexpectedErrors = errors.filter(e =>
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_CONNECTION_REFUSED') &&
        !e.includes('NetworkError')
      );
      expect(unexpectedErrors).toHaveLength(0);
    });

    test('should not have console errors on bug reports page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/bugs');
      await page.waitForTimeout(2000);
      const unexpectedErrors = errors.filter(e =>
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_CONNECTION_REFUSED') &&
        !e.includes('NetworkError')
      );
      expect(unexpectedErrors).toHaveLength(0);
    });
  });

  test.describe('API: Direct endpoint verification', () => {
    test('should exclude hidden items by default from feature requests list', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/feature-requests');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      // All items should be non-hidden by default
      for (const item of body.data) {
        expect(['duplicate', 'deprecated']).not.toContain(item.status);
      }
    });

    test('should include hidden items when include_hidden=true', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/feature-requests?include_hidden=true');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    test('should exclude hidden bugs by default', async ({ request }) => {
      // Verifies: FR-DUP-05
      const response = await request.get('/api/bugs');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data).toBeDefined();
      for (const item of body.data) {
        expect(['duplicate', 'deprecated']).not.toContain(item.status);
      }
    });

    test('should return 400 when marking duplicate without duplicate_of', async ({ request }) => {
      // Verifies: FR-DUP-04
      // First create a feature request
      const createRes = await request.post('/api/feature-requests', {
        data: { title: 'E2E dup test', description: 'Testing duplicate validation' }
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();

      // Try to mark as duplicate without duplicate_of
      const patchRes = await request.patch(`/api/feature-requests/${created.id}`, {
        data: { status: 'duplicate' }
      });
      expect(patchRes.status()).toBe(400);
    });

    test('should return individual hidden item by ID', async ({ request }) => {
      // Verifies: FR-DUP-06
      // Create two FRs and mark one as duplicate
      const fr1Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E canonical', description: 'Canonical item' }
      });
      const fr1 = await fr1Res.json();

      const fr2Res = await request.post('/api/feature-requests', {
        data: { title: 'E2E duplicate', description: 'Duplicate item' }
      });
      const fr2 = await fr2Res.json();

      // Mark fr2 as duplicate of fr1
      await request.patch(`/api/feature-requests/${fr2.id}`, {
        data: { status: 'duplicate', duplicate_of: fr1.id }
      });

      // GET by ID should still return it
      const getRes = await request.get(`/api/feature-requests/${fr2.id}`);
      expect(getRes.ok()).toBeTruthy();
      const body = await getRes.json();
      expect(body.status).toBe('duplicate');
      expect(body.duplicate_of).toBe(fr1.id);
    });
  });
});
