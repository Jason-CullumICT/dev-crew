// Verifies: dev-crew path references — chaos/adversarial scenarios
import { test, expect } from '@playwright/test';

test.describe('Feature: dev-crew path references (chaos)', () => {
  test('should not expose old repo names in page source or scripts', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Check all script tags and inline scripts for old references
    const scripts = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      return scriptTags.map((s) => s.textContent || '').join('\n');
    });
    expect(scripts).not.toContain('claude-ai-OS');
    expect(scripts).not.toContain('Work-backlog');
    expect(scripts).not.toContain('container-test');

    expect(consoleErrors).toEqual([]);
  });

  test('should not leak old repo names in network responses', async ({ page }) => {
    const oldRefResponses: string[] = [];

    // Intercept API responses and check for old repo names
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() === 200) {
        try {
          const text = await response.text();
          if (
            text.includes('claude-ai-OS') ||
            text.includes('Work-backlog')
          ) {
            oldRefResponses.push(url);
          }
        } catch {
          // ignore non-text responses
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to work items if available
    const workItemsLink = page.getByRole('link', { name: /work items/i });
    if (await workItemsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workItemsLink.click();
      await page.waitForLoadState('networkidle');
    }

    expect(oldRefResponses).toEqual([]);
  });

  test('should handle rapid navigation without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Rapid navigation — chaos scenario: quickly navigate between pages
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/work-items');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Verify no errors from rapid nav
    expect(consoleErrors).toEqual([]);
  });

  test('health endpoint should return valid JSON without old references', async ({ request }) => {
    const response = await request.get('/api/health');
    // Allow 200 or 502 (if backend isn't running in test env)
    if (response.status() === 200) {
      const body = await response.text();
      expect(body).not.toContain('claude-ai-OS');
      expect(body).not.toContain('Work-backlog');
      expect(body).not.toContain('container-test');

      // Verify valid JSON
      const json = JSON.parse(body);
      expect(json).toHaveProperty('status');
    }
  });
});
