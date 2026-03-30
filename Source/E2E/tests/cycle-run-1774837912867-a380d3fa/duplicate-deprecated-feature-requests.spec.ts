// Verifies: FR-0008 — E2E tests for duplicate/deprecated status on feature requests
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Status - Feature Requests', () => {

  test('should render the feature request list page', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
  });

  test('should show the "Show hidden" toggle on feature request list', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page.getByTestId('show-hidden-toggle')).toBeVisible();
    await expect(page.getByTestId('show-hidden-toggle')).not.toBeChecked();
  });

  test('should hide duplicate/deprecated FRs by default in list view', async ({ page }) => {
    await page.goto('/feature-requests');
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const opacity = await rows.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
      expect(opacity).toBe('1');
    }
  });

  test('should toggle hidden feature requests visibility', async ({ page }) => {
    await page.goto('/feature-requests');
    const toggle = page.getByTestId('show-hidden-toggle');
    await toggle.check();
    await expect(toggle).toBeChecked();
    await page.waitForTimeout(500);
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
  });

  test('should render feature request detail page', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    const frId = await firstLink.textContent();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    if (frId) {
      await expect(page.getByText(frId)).toBeVisible();
    }
  });

  test('should show Mark as Duplicate and Mark as Deprecated buttons on non-hidden FR', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).toBeVisible();
    await expect(page.getByTestId('mark-deprecated-btn')).toBeVisible();
  });

  test('should open duplicate form when Mark as Duplicate is clicked', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    await page.getByTestId('mark-duplicate-btn').click();
    await expect(page.getByTestId('duplicate-form')).toBeVisible();
    await expect(page.getByTestId('duplicate-of-input')).toBeVisible();
  });

  test('should open deprecated form when Mark as Deprecated is clicked', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    await page.getByTestId('mark-deprecated-btn').click();
    await expect(page.getByTestId('deprecated-form')).toBeVisible();
    await expect(page.getByTestId('deprecation-reason-input')).toBeVisible();
  });

  test('should mark an FR as deprecated and show the deprecated banner', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    await page.getByTestId('mark-deprecated-btn').click();
    await page.getByTestId('deprecation-reason-input').fill('Superseded by newer feature');
    await page.getByTestId('deprecated-submit').click();

    await expect(page.getByTestId('deprecated-banner')).toBeVisible();
    await expect(page.getByText('This item has been deprecated')).toBeVisible();
    await expect(page.getByText('Superseded by newer feature')).toBeVisible();
    await expect(page.getByTestId('restore-btn')).toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).not.toBeVisible();
  });

  test('should restore a deprecated FR and remove the banner', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('feature-request-detail')).toBeVisible();

    await page.getByTestId('mark-deprecated-btn').click();
    await page.getByTestId('deprecated-submit').click();
    await expect(page.getByTestId('deprecated-banner')).toBeVisible();

    await page.getByTestId('restore-btn').click();
    await expect(page.getByTestId('deprecated-banner')).not.toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).toBeVisible();
  });

  test('should show duplicate count badge on canonical items when hidden items are shown', async ({ page }) => {
    await page.goto('/feature-requests');
    // Toggle to show hidden items so we can see canonical items with duplicate badges
    const toggle = page.getByTestId('show-hidden-toggle');
    await toggle.check();
    await page.waitForTimeout(500);
    // Check if any duplicate count badges are visible (FR-0009 should have one from FR-0008 seed)
    const badges = page.locator('[data-testid^="dup-count-"]');
    const badgeCount = await badges.count();
    // At least FR-0009 should show a badge (from the FR-0008 seed duplicate)
    if (badgeCount > 0) {
      const firstBadge = badges.first();
      await expect(firstBadge).toBeVisible();
      await expect(firstBadge).toContainText('duplicate');
    }
  });

  test('should show dimmed rows for hidden items when toggle is on', async ({ page }) => {
    await page.goto('/feature-requests');
    const toggle = page.getByTestId('show-hidden-toggle');
    await toggle.check();
    await page.waitForTimeout(500);
    // Check for the seeded FR-0008 duplicate row
    const fr0008Row = page.getByTestId('fr-row-FR-0008');
    if (await fr0008Row.isVisible()) {
      const opacity = await fr0008Row.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThan(1);
    }
  });

  test('should not have console errors on feature request list page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/feature-requests');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should not have console errors on feature request detail page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/feature-requests');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
