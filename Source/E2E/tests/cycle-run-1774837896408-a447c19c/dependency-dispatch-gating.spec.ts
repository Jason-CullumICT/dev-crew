// Verifies: FR-dependency-dispatch-gating — E2E tests for dispatch gating and cascade
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Dispatch Gating', () => {
  test('PATCH /api/bugs/:id should gate dispatch when blockers are unresolved', async ({ request }) => {
    // Get existing bugs to find one with unresolved blockers
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    const bugWithBlockers = listBody.data.find(
      (b: any) => b.has_unresolved_blockers && b.status !== 'pending_dependencies',
    );

    if (bugWithBlockers) {
      // Attempt to approve — should be gated
      const response = await request.patch(`/api/bugs/${bugWithBlockers.id}`, {
        data: { status: 'approved' },
      });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe('pending_dependencies');
    }
  });

  test('PATCH /api/bugs/:id should allow approval when no blockers', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    const bugWithoutBlockers = listBody.data.find(
      (b: any) => !b.has_unresolved_blockers && b.status === 'new',
    );

    if (bugWithoutBlockers) {
      const response = await request.patch(`/api/bugs/${bugWithoutBlockers.id}`, {
        data: { status: 'approved' },
      });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe('approved');
    }
  });

  test('pending_dependencies status should display correctly in UI', async ({ page }) => {
    await page.goto('/bugs');
    // Check for any pending dependencies badges
    const pendingBadges = page.getByTestId('badge-pending-dependencies');
    const count = await pendingBadges.count();
    // If present, verify styling
    if (count > 0) {
      const badge = pendingBadges.first();
      await expect(badge).toHaveText('Pending Dependencies');
    }
  });

  test('pending_dependencies warning should show on detail page', async ({ page }) => {
    await page.goto('/bugs');
    // Find a bug with pending_dependencies status
    const rows = page.locator('tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const pendingBadge = row.getByTestId('badge-pending-dependencies');
      if (await pendingBadge.isVisible()) {
        // Click into the bug detail
        const link = row.locator('a[href^="/bugs/BUG-"]');
        await link.click();
        await expect(page.getByTestId('bug-detail')).toBeVisible();
        // Should show the pending deps warning
        await expect(page.getByTestId('pending-deps-warning')).toBeVisible();
        await expect(page.getByText('Dispatch blocked')).toBeVisible();
        break;
      }
    }
  });

  test('GET /api/feature-requests/:id/ready should reflect correct blocker status', async ({ request }) => {
    const listResponse = await request.get('/api/feature-requests');
    const listBody = await listResponse.json();
    for (const fr of listBody.data) {
      const readyResponse = await request.get(`/api/feature-requests/${fr.id}/ready`);
      const readyBody = await readyResponse.json();
      // If has unresolved blockers, ready should be false
      if (fr.has_unresolved_blockers) {
        expect(readyBody.ready).toBe(false);
        expect(readyBody.unresolved_blockers.length).toBeGreaterThan(0);
      }
    }
  });

  test('dependency chip should be clickable and navigate to blocker detail', async ({ page }) => {
    await page.goto('/feature-requests');
    // Navigate to a feature request that has dependencies (e.g., FR-0004)
    const frLink = page.locator('a[href="/feature-requests/FR-0004"]');
    if (await frLink.isVisible()) {
      await frLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      // Check for dependency chips
      const chips = page.locator('[data-testid^="dependency-chip-"]');
      if (await chips.count() > 0) {
        const firstChip = chips.first();
        const href = await firstChip.getAttribute('href');
        expect(href).toBeTruthy();
        // Verify it's a valid route
        expect(href).toMatch(/^\/(bugs|feature-requests)\/(BUG|FR)-\d+$/);
      }
    }
  });
});
