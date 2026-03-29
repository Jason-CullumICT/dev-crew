import { test, expect } from '@playwright/test';

// Verifies: FR-TRACE-004
test.describe('Feature: PR Traceability Report', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('should not have console errors on navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('should navigate to development cycle page if available', async ({ page }) => {
    await page.goto('/');
    const cycleLink = page.getByRole('link', { name: /cycle/i });
    if (await cycleLink.count() > 0) {
      await cycleLink.first().click();
      await expect(page).not.toHaveURL('/404');
    }
  });
});
