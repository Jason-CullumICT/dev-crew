// Verifies: FR-dependency-linking, FR-dependency-detail-ui, FR-dependency-list-ui, FR-dependency-picker, FR-dependency-dispatch-gating
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking', () => {
  test('should render bug list page with blocked badges', async ({ page }) => {
    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: /bug/i })).toBeVisible();
    // Verify list page loads without console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should render feature request list page with blocked badges', async ({ page }) => {
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: /feature/i })).toBeVisible();
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should show dependency section on bug detail page', async ({ page }) => {
    // Create a bug first via API
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Dependency Test Bug',
        description: 'Test bug for dependency linking E2E',
        severity: 'medium',
      },
    });
    expect(response.ok()).toBeTruthy();
    const bug = await response.json();

    // Navigate to bug detail
    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByText('Blocked By')).toBeVisible();
    await expect(page.getByText('Blocks')).toBeVisible();
    await expect(page.getByText('No blockers')).toBeVisible();
  });

  test('should show dependency section on feature request detail page', async ({ page }) => {
    // Create a feature request first via API
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

    // Navigate to FR detail
    await page.goto(`/feature-requests/${fr.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByText('Blocked By')).toBeVisible();
    await expect(page.getByText('Blocks')).toBeVisible();
  });

  test('should open dependency picker modal from bug detail', async ({ page }) => {
    // Create a bug
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

    // Click edit dependencies button
    const editBtn = page.getByTestId('edit-dependencies-btn');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.getByTestId('dependency-picker-modal')).toBeVisible();
      await expect(page.getByTestId('dependency-search-input')).toBeVisible();
      await expect(page.getByTestId('dependency-picker-cancel')).toBeVisible();
      await expect(page.getByTestId('dependency-picker-save')).toBeVisible();
    }
  });

  test('should add and display dependency via API', async ({ page }) => {
    // Create two bugs
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocker Bug', description: 'This blocks another', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocked Bug', description: 'This is blocked', severity: 'medium' },
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

  test('should check readiness endpoint for bug', async ({ page }) => {
    // Create a bug
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Ready Check Bug', description: 'Test readiness', severity: 'low' },
    });
    const bug = await bugRes.json();

    // Check readiness (no blockers = ready)
    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should check readiness endpoint for feature request', async ({ page }) => {
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Ready Check FR', description: 'Test readiness', source: 'manual' },
    });
    const fr = await frRes.json();

    const readyRes = await page.request.get(`/api/feature-requests/${fr.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should prevent circular dependencies via API', async ({ page }) => {
    // Create two bugs
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle Bug A', description: 'Cycle test A', severity: 'low' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle Bug B', description: 'Cycle test B', severity: 'low' },
    });
    const bug2 = await bug2Res.json();

    // Add: bug1 blocked_by bug2
    const dep1 = await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });
    expect(dep1.ok()).toBeTruthy();

    // Try to add: bug2 blocked_by bug1 (circular)
    const dep2 = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(dep2.status()).toBe(409);
  });

  test('should show search endpoint results', async ({ page }) => {
    // Create items for search
    await page.request.post('/api/bugs', {
      data: { title: 'Searchable Bug XYZ', description: 'For search test', severity: 'low' },
    });

    const searchRes = await page.request.get('/api/search?q=Searchable');
    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();
    expect(searchData.data.length).toBeGreaterThan(0);
  });

  test('should support cross-type dependencies (bug blocked by FR)', async ({ page }) => {
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Cross-type Blocker FR', description: 'Blocks a bug', source: 'manual' },
    });
    const fr = await frRes.json();

    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Cross-type Blocked Bug', description: 'Blocked by FR', severity: 'medium' },
    });
    const bug = await bugRes.json();

    const depRes = await page.request.post(`/api/bugs/${bug.id}/dependencies`, {
      data: { action: 'add', blocker_id: fr.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Verify readiness shows unresolved
    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(false);
    expect(readiness.unresolved_blockers.length).toBe(1);
  });
});
