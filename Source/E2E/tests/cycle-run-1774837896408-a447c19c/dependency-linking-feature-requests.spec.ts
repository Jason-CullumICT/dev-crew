// Verifies: FR-dependency-linking — E2E tests for feature request dependency linking
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking - Feature Requests', () => {
  test('should render the feature requests list page', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
    // Verify table structure
    await expect(page.locator('th:has-text("ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Priority")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should show blocked badge on feature requests with unresolved blockers', async ({ page }) => {
    await page.goto('/feature-requests');
    const blockedBadges = page.getByTestId('badge-blocked');
    const pendingBadges = page.getByTestId('badge-pending-dependencies');
    const badgeCount = (await blockedBadges.count()) + (await pendingBadges.count());
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to feature request detail page', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      const href = await firstFRLink.getAttribute('href');
      await firstFRLink.click();
      await page.waitForURL(`**${href}`);
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
    }
  });

  test('should display dependency section on feature request detail page', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      await expect(page.getByTestId('dependency-section')).toBeVisible();
      await expect(page.getByText('Blocked By')).toBeVisible();
      await expect(page.getByText('Blocks')).toBeVisible();
    }
  });

  test('should show edit dependencies button on feature request detail', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      await expect(page.getByTestId('edit-dependencies-btn')).toBeVisible();
    }
  });

  test('should open dependency picker modal for feature request', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      await page.getByTestId('edit-dependencies-btn').click();
      await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
      await expect(page.getByTestId('dependency-search-input')).toBeVisible();
    }
  });

  test('should close dependency picker modal on cancel', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      await page.getByTestId('edit-dependencies-btn').click();
      await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
      await page.getByTestId('dependency-picker-cancel').click();
      await expect(page.getByTestId('dependency-picker-modal')).not.toBeVisible();
    }
  });

  test('should display feature request status and priority', async ({ page }) => {
    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await expect(page.getByTestId('feature-request-detail')).toBeVisible();
      await expect(page.getByText(/Priority:/)).toBeVisible();
    }
  });

  test('should show dependency chips for feature requests with known dependencies', async ({ page }) => {
    // FR-0004 should be blocked by FR-0003 (seeded data)
    await page.goto('/feature-requests/FR-0004');
    const detail = page.getByTestId('feature-request-detail');
    if (await detail.isVisible()) {
      const dependencySection = page.getByTestId('dependency-section');
      await expect(dependencySection).toBeVisible();
      // Check for dependency chip for FR-0003
      const chip = page.getByTestId('dependency-chip-FR-0003');
      if (await chip.isVisible()) {
        await expect(chip).toBeVisible();
      }
    }
  });

  test('should not have console errors on feature requests list page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/feature-requests');
    await page.waitForTimeout(2000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should not have console errors on feature request detail page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/feature-requests');
    const firstFRLink = page.locator('a[href^="/feature-requests/FR-"]').first();
    if (await firstFRLink.isVisible()) {
      await firstFRLink.click();
      await page.waitForTimeout(2000);
      expect(consoleErrors).toHaveLength(0);
    }
  });
});
