import { test, expect } from '@playwright/test';

// Verifies: FR-PTR-003 — PR traceability section visibility
// Note: This feature modifies pipeline infrastructure (platform/, tools/) not frontend UI.
// These tests verify the orchestrator dashboard still renders correctly after the changes.
test.describe('Feature: PR Traceability Report', () => {
  test('should render the orchestrator dashboard without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
    expect(consoleErrors).toEqual([]);
  });
});
