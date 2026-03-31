import { test, expect } from '@playwright/test';

// Verifies: FR-PTR-003 — Smoke test for PR traceability report feature.
// This feature modifies backend/platform tooling only (no new UI pages).
// These tests verify the existing dashboard remains functional after the change.
test.describe('Feature: PR Traceability Report (smoke)', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should navigate to work items page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.getByText('Work Items').click();
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Work Items')).toBeVisible();
  });
});
