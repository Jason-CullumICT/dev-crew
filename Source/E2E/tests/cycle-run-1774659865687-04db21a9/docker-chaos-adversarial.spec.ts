// Verifies: dev-crew unified repo — Task 3 (chaos-tester adversarial scenarios)
// Tests edge cases and adversarial conditions for the Docker infrastructure setup
import { test, expect } from '@playwright/test';

test.describe('Feature: Docker Infrastructure — Chaos/Adversarial Tests', () => {
  test('should handle rapid navigation between all routes without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Rapid navigation: hit every route quickly without waiting for full load
    await page.goto('/');
    await page.goto('/work-items');
    await page.goto('/work-items/new');
    await page.goto('/debug');
    await page.goto('/');

    // Wait for any deferred errors
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('should handle direct navigation to /debug without going through home first', async ({ page }) => {
    // Cold start directly to debug page — no prior navigation
    const response = await page.goto('/debug');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('iframe[title="Debug Portal"]')).toBeVisible();
  });

  test('should handle navigation to nonexistent route gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    const response = await page.goto('/nonexistent-route-12345');
    expect(response).not.toBeNull();
    // Should not crash — React Router handles unknown routes
    expect(response!.status()).toBeLessThan(500);

    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('should render debug portal iframe with correct title attribute', async ({ page }) => {
    await page.goto('/debug');
    const iframe = page.locator('iframe');
    await expect(iframe).toHaveAttribute('title', 'Debug Portal');
    // Verify iframe has no border (style check)
    const border = await iframe.evaluate((el) => window.getComputedStyle(el).border);
    expect(border).toContain('none');
  });

  test('should have exactly 4 navigation items including Debug Portal', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav[data-testid="main-nav"] a');
    await expect(navLinks).toHaveCount(4);

    // Verify order matches NAV_ITEMS definition
    const labels = await navLinks.allTextContents();
    expect(labels).toEqual(['Dashboard', 'Work Items', 'Create Item', 'Debug Portal']);
  });

  test('should highlight active nav item on debug page', async ({ page }) => {
    await page.goto('/debug');
    const debugLink = page.getByRole('link', { name: 'Debug Portal' });
    await expect(debugLink).toBeVisible();
    // Active link should have different styling (fontWeight 600)
    const fontWeight = await debugLink.evaluate((el) => window.getComputedStyle(el).fontWeight);
    expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
  });

  test('should not have console errors when backend API is unreachable', async ({ page }) => {
    // Navigate to a page that doesn't depend on the API
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/debug');
    await page.waitForTimeout(1000);

    // Filter out expected iframe/network errors
    const unexpectedErrors = consoleErrors.filter(
      (e) =>
        !e.includes('iframe') &&
        !e.includes('refused to connect') &&
        !e.includes('ERR_CONNECTION_REFUSED') &&
        !e.includes('net::ERR_') &&
        !e.includes('favicon')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('should handle back/forward browser navigation correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    await page.goto('/debug');
    await expect(page.locator('iframe[title="Debug Portal"]')).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    await page.goForward();
    await expect(page.locator('iframe[title="Debug Portal"]')).toBeVisible();
  });
});
