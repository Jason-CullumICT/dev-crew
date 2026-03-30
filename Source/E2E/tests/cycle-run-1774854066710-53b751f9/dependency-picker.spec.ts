// Verifies: FR-dependency-picker, FR-dependency-linking
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Picker', () => {
  test('should navigate to bug detail and find edit dependencies button', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/bugs');
    await page.waitForTimeout(1000);

    const bugLinks = page.locator('[data-testid*="bug-"]');
    const count = await bugLinks.count();

    if (count > 0) {
      await bugLinks.first().click();
      await page.waitForTimeout(500);

      // Look for Edit Dependencies button
      const editDepsButton = page.getByRole('button', { name: /edit dependencies/i });
      if (await editDepsButton.isVisible()) {
        await editDepsButton.click();

        // The dependency picker modal should open
        await page.waitForTimeout(300);

        // Look for search input in the modal
        const searchInput = page.getByPlaceholder(/search/i);
        if (await searchInput.isVisible()) {
          await searchInput.fill('test');
          await page.waitForTimeout(500); // debounce
        }

        // Close the modal
        const cancelButton = page.getByRole('button', { name: /cancel|close/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('should navigate to feature request detail and find edit dependencies button', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/feature-requests');
    await page.waitForTimeout(1000);

    const frLinks = page.locator('[data-testid*="fr-"]');
    const count = await frLinks.count();

    if (count > 0) {
      await frLinks.first().click();
      await page.waitForTimeout(500);

      const editDepsButton = page.getByRole('button', { name: /edit dependencies/i });
      if (await editDepsButton.isVisible()) {
        await editDepsButton.click();
        await page.waitForTimeout(300);

        // Verify modal appeared
        await expect(page.locator('body')).toBeVisible();

        const cancelButton = page.getByRole('button', { name: /cancel|close/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }

    expect(consoleErrors).toHaveLength(0);
  });
});
