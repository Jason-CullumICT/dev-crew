// Verifies: FR-0008 — E2E tests for duplicate/deprecated status on bugs
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Status - Bugs', () => {

  test('should render the bug list page', async ({ page }) => {
    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: 'Bugs' })).toBeVisible();
  });

  test('should show the "Show hidden" toggle on bug list', async ({ page }) => {
    await page.goto('/bugs');
    await expect(page.getByTestId('show-hidden-toggle')).toBeVisible();
    // Toggle should be unchecked by default
    await expect(page.getByTestId('show-hidden-toggle')).not.toBeChecked();
  });

  test('should hide duplicate/deprecated bugs by default in list view', async ({ page }) => {
    await page.goto('/bugs');
    // Duplicate and deprecated items should not appear in the default list
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    // Each visible row should not have opacity 0.5 styling
    for (let i = 0; i < count; i++) {
      const opacity = await rows.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
      expect(opacity).toBe('1');
    }
  });

  test('should toggle hidden bugs visibility when checkbox is clicked', async ({ page }) => {
    await page.goto('/bugs');
    const toggle = page.getByTestId('show-hidden-toggle');
    // Click to show hidden items
    await toggle.check();
    await expect(toggle).toBeChecked();
    // Page should re-render (may show more rows or same rows depending on data)
    await page.waitForTimeout(500);
    // Click to hide them again
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
  });

  test('should render bug detail page', async ({ page }) => {
    // Navigate to first bug in list
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    const bugId = await firstLink.textContent();
    await firstLink.click();
    // Should show bug detail with the ID
    await expect(page.getByTestId('bug-detail')).toBeVisible();
    if (bugId) {
      await expect(page.getByText(bugId)).toBeVisible();
    }
  });

  test('should show Mark as Duplicate and Mark as Deprecated buttons on non-hidden bug', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).toBeVisible();
    await expect(page.getByTestId('mark-deprecated-btn')).toBeVisible();
  });

  test('should open duplicate form when Mark as Duplicate is clicked', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();
    await page.getByTestId('mark-duplicate-btn').click();
    await expect(page.getByTestId('duplicate-form')).toBeVisible();
    await expect(page.getByTestId('duplicate-of-input')).toBeVisible();
  });

  test('should open deprecated form when Mark as Deprecated is clicked', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();
    await page.getByTestId('mark-deprecated-btn').click();
    await expect(page.getByTestId('deprecated-form')).toBeVisible();
    await expect(page.getByTestId('deprecation-reason-input')).toBeVisible();
  });

  test('should mark a bug as deprecated and show the deprecated banner', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    // Mark as deprecated with a reason
    await page.getByTestId('mark-deprecated-btn').click();
    await page.getByTestId('deprecation-reason-input').fill('No longer relevant');
    await page.getByTestId('deprecated-submit').click();

    // Should show deprecated banner
    await expect(page.getByTestId('deprecated-banner')).toBeVisible();
    await expect(page.getByText('This item has been deprecated')).toBeVisible();
    await expect(page.getByText('No longer relevant')).toBeVisible();

    // Should show restore button instead of mark buttons
    await expect(page.getByTestId('restore-btn')).toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).not.toBeVisible();
  });

  test('should restore a deprecated bug and remove the banner', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    // Mark as deprecated
    await page.getByTestId('mark-deprecated-btn').click();
    await page.getByTestId('deprecated-submit').click();
    await expect(page.getByTestId('deprecated-banner')).toBeVisible();

    // Restore
    await page.getByTestId('restore-btn').click();
    await expect(page.getByTestId('deprecated-banner')).not.toBeVisible();
    await expect(page.getByTestId('mark-duplicate-btn')).toBeVisible();
  });

  test('should not have console errors on bug list page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/bugs');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should not have console errors on bug detail page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
