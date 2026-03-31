// Verifies: FR-PTR-003 — E2E smoke test for PR traceability report feature
// Note: This feature modifies pipeline infrastructure (platform/) and CLI tools (tools/).
// There are no new frontend pages or routes. This test verifies that the existing
// dashboard page still renders correctly after the pipeline changes.
import { test, expect } from '@playwright/test';

test.describe('Feature: PR Traceability Report', () => {
  test('dashboard page still renders after pipeline changes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('no console errors on dashboard navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (e.g. favicon, HMR)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('HMR') && !e.includes('WebSocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('work items page still renders after pipeline changes', async ({ page }) => {
    await page.goto('/work-items');
    await page.waitForLoadState('networkidle');
    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation between pages works without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/work-items');
    await page.waitForLoadState('networkidle');

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('HMR') && !e.includes('WebSocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
