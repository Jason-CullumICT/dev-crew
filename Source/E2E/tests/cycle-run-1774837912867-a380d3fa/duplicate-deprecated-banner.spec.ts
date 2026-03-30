// Verifies: FR-0008 — E2E tests for the DuplicateDeprecatedBanner component behavior
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Banners', () => {

  test('should show duplicate banner with link to canonical item on a duplicate bug', async ({ page }) => {
    // Navigate to bug list, find a bug, mark it as duplicate, verify banner
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    const bugId = await firstLink.textContent();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    // Get a second bug ID to use as canonical
    await page.goto('/bugs');
    const links = page.locator('tbody tr td a');
    const linkCount = await links.count();
    if (linkCount < 2) {
      test.skip();
      return;
    }
    const canonicalId = await links.nth(1).textContent();
    // Navigate back to first bug
    await links.first().click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    // Mark as duplicate
    await page.getByTestId('mark-duplicate-btn').click();
    await page.getByTestId('duplicate-of-input').fill(canonicalId || '');
    await page.getByTestId('duplicate-submit').click();

    // Verify duplicate banner appears with link
    await expect(page.getByTestId('duplicate-banner')).toBeVisible();
    await expect(page.getByText('This item is a duplicate of')).toBeVisible();
    if (canonicalId) {
      await expect(page.getByTestId('duplicate-banner').getByText(canonicalId)).toBeVisible();
      // Link should be present
      const link = page.getByTestId('duplicate-banner').locator('a');
      await expect(link).toHaveAttribute('href', /\/(bugs|feature-requests)\//);
    }

    // Restore for cleanup
    await page.getByTestId('restore-btn').click();
    await expect(page.getByTestId('duplicate-banner')).not.toBeVisible();
  });

  test('should show deprecated banner with reason text', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    await page.getByTestId('mark-deprecated-btn').click();
    await page.getByTestId('deprecation-reason-input').fill('Problem no longer exists');
    await page.getByTestId('deprecated-submit').click();

    await expect(page.getByTestId('deprecated-banner')).toBeVisible();
    await expect(page.getByText('This item has been deprecated')).toBeVisible();
    await expect(page.getByText('Problem no longer exists')).toBeVisible();

    // Restore for cleanup
    await page.getByTestId('restore-btn').click();
  });

  test('should show deprecated banner without reason when none provided', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    await page.getByTestId('mark-deprecated-btn').click();
    // Leave reason empty
    await page.getByTestId('deprecated-submit').click();

    await expect(page.getByTestId('deprecated-banner')).toBeVisible();
    await expect(page.getByText('This item has been deprecated')).toBeVisible();

    // Restore for cleanup
    await page.getByTestId('restore-btn').click();
  });

  test('should show duplicated-by badge on canonical FR-0009 (from seeded FR-0008 duplicate)', async ({ page }) => {
    // FR-0008 is seeded as duplicate of FR-0009
    await page.goto('/feature-requests');
    // Need to enable hidden items toggle first to ensure FR-0009 shows its badge
    // (FR-0009 should still show normally since it's the canonical, not the duplicate)
    const toggle = page.getByTestId('show-hidden-toggle');

    // Navigate to FR-0009 detail
    // First check if FR-0009 is visible
    const fr0009Link = page.locator('a[href="/feature-requests/FR-0009"]');
    if (await fr0009Link.isVisible()) {
      await fr0009Link.click();
    } else {
      // May need to toggle hidden items to find FR-0009 in the list (though it shouldn't be hidden)
      await toggle.check();
      await page.waitForTimeout(500);
      const link = page.locator('a[href="/feature-requests/FR-0009"]');
      if (await link.isVisible()) {
        await link.click();
      } else {
        test.skip();
        return;
      }
    }

    await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    // FR-0009 should show the "duplicated by" badge since FR-0008 points to it
    await expect(page.getByTestId('duplicated-by-badge')).toBeVisible();
    await expect(page.getByTestId('duplicated-by-badge')).toContainText('duplicate');
  });

  test('should show error when trying to mark as duplicate of self', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    const bugId = await firstLink.textContent();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    await page.getByTestId('mark-duplicate-btn').click();
    await page.getByTestId('duplicate-of-input').fill(bugId || '');
    await page.getByTestId('duplicate-submit').click();

    // Should show an error
    await expect(page.getByTestId('action-error')).toBeVisible();
  });

  test('should show error when trying to mark as duplicate of non-existent item', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    await page.getByTestId('mark-duplicate-btn').click();
    await page.getByTestId('duplicate-of-input').fill('BUG-99999');
    await page.getByTestId('duplicate-submit').click();

    await expect(page.getByTestId('action-error')).toBeVisible();
  });

  test('should cancel duplicate form without submitting', async ({ page }) => {
    await page.goto('/bugs');
    const firstLink = page.locator('tbody tr td a').first();
    await firstLink.click();
    await expect(page.getByTestId('bug-detail')).toBeVisible();

    await page.getByTestId('mark-duplicate-btn').click();
    await expect(page.getByTestId('duplicate-form')).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('duplicate-form')).not.toBeVisible();
    // Original buttons should still be there
    await expect(page.getByTestId('mark-duplicate-btn')).toBeVisible();
  });
});
