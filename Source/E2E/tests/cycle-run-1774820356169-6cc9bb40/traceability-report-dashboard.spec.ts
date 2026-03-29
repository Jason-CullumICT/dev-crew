import { test, expect } from '@playwright/test';

// Verifies: FR-TRACE-004
test.describe('Feature: PR Traceability Report - Dashboard Integration', () => {
  test('should render the dashboard page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    expect(consoleErrors).toHaveLength(0);
  });

  test('should navigate to development cycle page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/cycles');
    await expect(page).toHaveURL(/\/cycles/);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should render feature browser page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/features');
    await expect(page).toHaveURL(/\/features/);
    expect(consoleErrors).toHaveLength(0);
  });
});
