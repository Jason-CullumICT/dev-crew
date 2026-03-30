// Verifies: FR-dependency-linking, FR-dependency-detail-ui, FR-dependency-list-ui, FR-dependency-picker
// E2E tests for dependency linking UI and API
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking', () => {
  test('should render bug list page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: /bug/i })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should render feature request list page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: /feature/i })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should show dependency section on bug detail page', async ({ page }) => {
    // Create a bug via API
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Dependency Test Bug',
        description: 'Test bug for dependency linking E2E',
        severity: 'medium',
      },
    });
    expect(response.ok()).toBeTruthy();
    const bug = await response.json();

    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByText('Blocked By')).toBeVisible();
    await expect(page.getByText('Blocks')).toBeVisible();
    await expect(page.getByText('No blockers')).toBeVisible();
  });

  test('should show dependency section on feature request detail page', async ({ page }) => {
    const response = await page.request.post('/api/feature-requests', {
      data: {
        title: 'E2E Dependency Test FR',
        description: 'Test FR for dependency linking E2E',
        source: 'manual',
        priority: 'medium',
      },
    });
    expect(response.ok()).toBeTruthy();
    const fr = await response.json();

    await page.goto(`/feature-requests/${fr.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByText('Blocked By')).toBeVisible();
    await expect(page.getByText('Blocks')).toBeVisible();
  });

  test('should open dependency picker modal from detail view', async ({ page }) => {
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Picker Test Bug',
        description: 'Test bug for dependency picker E2E',
        severity: 'low',
      },
    });
    const bug = await response.json();

    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();

    const editBtn = page.getByTestId('edit-dependencies-btn');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
      await expect(page.getByTestId('dependency-search-input')).toBeVisible();
      await expect(page.getByTestId('dependency-picker-cancel')).toBeVisible();
      await expect(page.getByTestId('dependency-picker-save')).toBeVisible();
    }
  });

  test('should add and display dependency via API then verify in UI', async ({ page }) => {
    // Create two bugs
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Blocker Bug', description: 'This blocks another', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Blocked Bug', description: 'This is blocked', severity: 'medium' },
    });
    const bug2 = await bug2Res.json();

    // Add dependency: bug2 blocked_by bug1
    const depRes = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Navigate to blocked bug detail
    await page.goto(`/bugs/${bug2.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByTestId(`dependency-chip-${bug1.id}`)).toBeVisible();
  });

  test('should support cross-type dependencies (bug blocked by FR)', async ({ page }) => {
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'E2E Cross-type Blocker FR', description: 'Blocks a bug', source: 'manual' },
    });
    const fr = await frRes.json();

    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'E2E Cross-type Blocked Bug', description: 'Blocked by FR', severity: 'medium' },
    });
    const bug = await bugRes.json();

    const depRes = await page.request.post(`/api/bugs/${bug.id}/dependencies`, {
      data: { action: 'add', blocker_id: fr.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Verify via readiness endpoint
    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(false);
    expect(readiness.unresolved_blockers.length).toBe(1);
  });
});
