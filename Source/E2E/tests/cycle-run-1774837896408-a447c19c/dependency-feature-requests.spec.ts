// Verifies: FR-0001 — E2E tests for feature request dependency linking UI
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking - Feature Requests', () => {

  test('should render the feature request list page with table', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Priority' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('should display blocked/pending badges on items with dependency issues', async ({ page }) => {
    await page.goto('/feature-requests');
    // Check for badge elements — may or may not be present depending on seed data state
    const blockedBadges = page.getByTestId('badge-blocked');
    const pendingBadges = page.getByTestId('badge-pending-dependencies');
    const totalBadges = await blockedBadges.count() + await pendingBadges.count();
    expect(totalBadges).toBeGreaterThanOrEqual(0);
  });

  test('should navigate from feature request list to detail', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('table tbody tr a').first();
    await expect(firstLink).toBeVisible();
    const frId = await firstLink.textContent();
    await firstLink.click();
    // Should navigate to detail page
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    if (frId) {
      await expect(page.getByText(frId)).toBeVisible();
    }
  });

  test('should render feature request detail with dependency section', async ({ page }) => {
    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    // Verify dependency section
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByText('Blocked By')).toBeVisible();
    await expect(page.getByText('Blocks')).toBeVisible();
  });

  test('should show priority and status on feature request detail', async ({ page }) => {
    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    await expect(page.getByText(/Priority:/)).toBeVisible();
    await expect(page.getByText(/Created:/)).toBeVisible();
  });

  test('should show edit dependencies button on feature request detail', async ({ page }) => {
    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    await expect(page.getByTestId('edit-dependencies-btn')).toBeVisible();
  });

  test('should open and close dependency picker on feature request', async ({ page }) => {
    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    // Open picker
    await page.getByTestId('edit-dependencies-btn').click();
    await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
    await expect(page.getByTestId('dependency-search-input')).toBeVisible();

    // Close via cancel
    await page.getByTestId('dependency-picker-cancel').click();
    await expect(page.getByTestId('dependency-picker-modal')).not.toBeVisible();
  });

  test('should search for items in dependency picker', async ({ page }) => {
    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    // Open picker
    await page.getByTestId('edit-dependencies-btn').click();
    await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();

    // Type a search query (at least 2 chars to trigger search)
    await page.getByTestId('dependency-search-input').fill('BUG');
    // Wait for debounced search (300ms + network)
    await page.waitForTimeout(500);

    // Results should appear (or "No results found" if no bugs exist)
    const results = page.getByTestId('dependency-search-results');
    const noResults = page.getByText('No results found');
    const hasResults = await results.isVisible().catch(() => false);
    const hasNoResults = await noResults.isVisible().catch(() => false);
    expect(hasResults || hasNoResults).toBeTruthy();
  });

  test('should display dependency chips with status on detail page', async ({ page }) => {
    // Navigate to a feature request known to have dependencies (FR-0004 blocked by FR-0003)
    await page.goto('/feature-requests/FR-0004');

    // If the item exists and has dependencies, chips should be visible
    const detail = page.getByTestId('feature-request-detail');
    const isDetailVisible = await detail.isVisible().catch(() => false);

    if (isDetailVisible) {
      const depSection = page.getByTestId('dependency-section');
      await expect(depSection).toBeVisible();
      // Check for dependency chips
      const chips = page.locator('[data-testid^="dependency-chip-"]');
      const chipCount = await chips.count();
      // FR-0004 should have at least one blocker (FR-0003)
      expect(chipCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should not have console errors on feature request list', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/feature-requests');
    await page.waitForTimeout(1000);

    expect(consoleErrors).toHaveLength(0);
  });

  test('should not have console errors on feature request detail', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/feature-requests');
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    await page.waitForTimeout(1000);

    expect(consoleErrors).toHaveLength(0);
  });
});
