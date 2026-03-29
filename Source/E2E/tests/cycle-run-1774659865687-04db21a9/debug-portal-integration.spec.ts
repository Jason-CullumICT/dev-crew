// Verifies: dev-crew unified repo — Task 3 + Task 6 (Debug Portal integration)
// Tests the DebugPortalPage component and its integration with the layout navigation

import { test, expect } from '@playwright/test';

test.describe('Feature: Debug Portal Page', () => {
  test('should render the debug portal page at /debug', async ({ page }) => {
    await page.goto('/debug');
    // The debug portal page should render an iframe targeting the portal URL
    const iframe = page.locator('iframe[title="Debug Portal"]');
    await expect(iframe).toBeVisible();
  });

  test('should have iframe with correct default src', async ({ page }) => {
    await page.goto('/debug');
    const iframe = page.locator('iframe[title="Debug Portal"]');
    const src = await iframe.getAttribute('src');
    // Default portal URL when VITE_PORTAL_URL is not set
    expect(src).toBe('http://localhost:4200');
  });

  test('should have full-width iframe styling', async ({ page }) => {
    await page.goto('/debug');
    const iframe = page.locator('iframe[title="Debug Portal"]');
    const style = await iframe.getAttribute('style');
    expect(style).toContain('width: 100%');
    expect(style).toContain('height: 100%');
    expect(style).toContain('border: none');
  });

  test('should show Debug Portal in navigation bar', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('[data-testid="main-nav"]');
    await expect(nav).toBeVisible();
    const debugLink = nav.getByRole('link', { name: 'Debug Portal' });
    await expect(debugLink).toBeVisible();
  });

  test('should navigate from dashboard to debug portal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Debug Portal' }).click();
    await expect(page).toHaveURL(/\/debug/);
    await expect(page.locator('iframe[title="Debug Portal"]')).toBeVisible();
  });

  test('should highlight Debug Portal nav link when on /debug', async ({ page }) => {
    await page.goto('/debug');
    const debugLink = page.getByRole('link', { name: 'Debug Portal' });
    // Active links get fontWeight 600 and color #60a5fa per Layout.tsx
    const fontWeight = await debugLink.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(fontWeight).toBe('600');
  });

  test('should have all four navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Work Items' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Item' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Debug Portal' })).toBeVisible();
  });

  test('should not have JavaScript errors on debug portal page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/debug');
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});
