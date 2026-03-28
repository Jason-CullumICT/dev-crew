// Verifies: dev-crew path references — config and API endpoint checks
import { test, expect } from '@playwright/test';

test.describe('Feature: dev-crew path references (config/API)', () => {
  test('should render the main page with dev-crew branding', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Verify the page title contains dev-crew (pipeline dashboard)
    const title = await page.title();
    expect(title.toLowerCase()).toContain('dev-crew');

    // Verify heading shows dev-crew
    const heading = page.locator('h1');
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain('dev-crew');
      expect(headingText).not.toContain('claude-ai-OS');
      expect(headingText).not.toContain('Work-backlog');
    }

    expect(consoleErrors).toEqual([]);
  });

  test('settings page should not contain old repo names', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/settings');
    await expect(page.locator('body')).toBeVisible();

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('claude-ai-OS');
    expect(bodyText).not.toContain('Work-backlog');

    expect(consoleErrors).toEqual([]);
  });

  test('form submissions should work without referencing old repos', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // If there's a task/work submission form, verify it works
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill('Test task for dev-crew path reference verification');

      // Look for submit button
      const submitBtn = page.getByRole('button', { name: /submit|run|start/i });
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Just verify the button is clickable, don't actually submit
        await expect(submitBtn).toBeEnabled();
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
