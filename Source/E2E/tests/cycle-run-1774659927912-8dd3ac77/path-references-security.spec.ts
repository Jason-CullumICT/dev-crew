// Verifies: dev-crew path references — security checks for old repo name removal
import { test, expect } from '@playwright/test';

test.describe('Feature: dev-crew path references (security)', () => {
  test('work items page should not leak old repo names', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/work-items');
    await expect(page.locator('body')).toBeVisible();

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('claude-ai-OS');
    expect(bodyText).not.toContain('Work-backlog');
    expect(consoleErrors).toEqual([]);
  });

  test('dashboard page should not contain old repo references', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Check the HTML source for hidden references (e.g., in data attributes, comments)
    const htmlContent = await page.content();
    expect(htmlContent).not.toContain('claude-ai-OS');
    expect(htmlContent).not.toContain('Work-backlog');
    expect(consoleErrors).toEqual([]);
  });

  test('navigation should work without errors across pages', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate through main pages
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to work items
    const workItemsLink = page.getByRole('link', { name: /work items/i });
    if (await workItemsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workItemsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });
});
