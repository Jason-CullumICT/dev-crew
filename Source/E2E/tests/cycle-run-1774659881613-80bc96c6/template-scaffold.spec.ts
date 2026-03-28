import { test, expect } from '@playwright/test';

test.describe('Feature: Template Scaffold Cleanup Verification', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate to work items without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/work-items');
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
