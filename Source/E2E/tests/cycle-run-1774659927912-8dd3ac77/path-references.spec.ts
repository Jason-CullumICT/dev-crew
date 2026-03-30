// Verifies: dev-crew path references — ensure old repo names are removed from UI
import { test, expect } from '@playwright/test';

test.describe('Feature: dev-crew path references', () => {
  test('pipeline dashboard should show dev-crew branding, not old repo names', async ({ page }) => {
    // Register console error listener before any navigation
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // The orchestrator dashboard is served at :8080 but we test the portal frontend
    // which proxies orchestrator requests. Navigate to the main page.
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);

    // Navigate to the cycles/orchestrator page if it exists
    const cycleLink = page.getByRole('link', { name: /cycle/i });
    if (await cycleLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cycleLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Verify page content does not contain old repo names in visible text
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('claude-ai-OS');
    expect(bodyText).not.toContain('Work-backlog');

    // Check that no console errors occurred
    expect(consoleErrors).toEqual([]);
  });

  test('should render the main page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
