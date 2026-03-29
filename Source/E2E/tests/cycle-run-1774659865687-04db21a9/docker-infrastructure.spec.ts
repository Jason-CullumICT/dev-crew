// Verifies: dev-crew unified repo — Task 3 (Dockerfiles and docker-compose)
// This test validates that the application pages remain accessible after
// infrastructure changes (new Dockerfiles, docker-compose, .env.example).

import { test, expect } from '@playwright/test';

test.describe('Feature: Docker Infrastructure — Portal & App Accessibility', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should render the work items page', async ({ page }) => {
    await page.goto('/work-items');
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();
  });

  test('should navigate to create work item page', async ({ page }) => {
    await page.goto('/work-items/new');
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();
  });

  test('should have no console errors on main pages', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/work-items');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (e.g. favicon, network timeouts)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR_')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
