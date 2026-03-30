import { test, expect } from '@playwright/test';

// Verifies: Template cleanup (Task 4) did not break the application
test.describe('Smoke test: template cleanup has no app impact', () => {
  test('should render the main page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    expect(consoleErrors).toEqual([]);
  });

  test('should navigate to work items page', async ({ page }) => {
    await page.goto('/work-items');
    await expect(page.locator('body')).toBeVisible();
  });
});
