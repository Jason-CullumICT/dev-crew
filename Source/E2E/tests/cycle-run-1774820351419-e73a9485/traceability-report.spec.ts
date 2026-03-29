// Verifies: FR-TRACE-004, FR-TRACE-005
import { test, expect } from '@playwright/test';

test.describe('Feature: PR Traceability Report', () => {
  test('should render the dashboard page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('should navigate to development cycle page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/cycles');
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toEqual([]);
  });

  test('should display orchestrator cycles page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/orchestrator');
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toEqual([]);
  });
});
