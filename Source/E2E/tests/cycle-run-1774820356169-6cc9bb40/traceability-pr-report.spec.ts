import { test, expect } from '@playwright/test';

// Verifies: FR-TRACE-004
test.describe('Feature: PR Traceability Report', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate to development cycle page', async ({ page }) => {
    await page.goto('/cycles');
    await expect(page.getByRole('heading', { name: /cycle/i })).toBeVisible();
  });

  test('should display feature browser page', async ({ page }) => {
    await page.goto('/features');
    await expect(page.getByRole('heading', { name: /feature/i })).toBeVisible();
  });

  test('should have no console errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
