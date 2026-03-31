import { test, expect } from '@playwright/test';

// Verifies: FR-PTR-003 — E2E smoke test for dashboard (traceability feature is backend-only;
// this verifies the pipeline dashboard still loads correctly after changes)
test.describe('Feature: PR Traceability Report', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should navigate to work items without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.getByText('Work Items').click();
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('should load dashboard without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
