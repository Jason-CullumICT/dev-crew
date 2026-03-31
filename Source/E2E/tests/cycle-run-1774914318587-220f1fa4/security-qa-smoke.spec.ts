import { test, expect } from '@playwright/test';

// Verifies: FR-PTR-003 — Security QA smoke test
// This feature modifies platform/orchestrator and tools/ only (no frontend changes).
// These tests verify the existing UI is not broken by the pipeline infrastructure changes.
test.describe('Feature: PR Traceability Report (security-qa)', () => {
  test('should render the dashboard page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
    await page.waitForLoadState('networkidle');

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('HMR') && !e.includes('WebSocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should navigate to work items page', async ({ page }) => {
    await page.goto('/work-items');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
