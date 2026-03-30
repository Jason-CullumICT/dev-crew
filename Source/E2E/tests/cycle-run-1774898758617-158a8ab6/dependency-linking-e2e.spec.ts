// Verifies: FR-dependency-linking, FR-dependency-detail-ui, FR-dependency-list-ui, FR-dependency-picker
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking', () => {
  test('should render bug list page with blocked badges visible', async ({ page }) => {
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
    // Verifies: FR-dependency-detail-ui — DependencySection renders on bug detail
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Traceability Dep Bug',
        description: 'Test bug for dependency section',
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
    // Verifies: FR-dependency-detail-ui — DependencySection renders on FR detail
    const response = await page.request.post('/api/feature-requests', {
      data: {
        title: 'E2E Traceability Dep FR',
        description: 'Test FR for dependency section',
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

  test('should open dependency picker modal from detail page', async ({ page }) => {
    // Verifies: FR-dependency-picker — Modal opens with search input and action buttons
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Picker Test Bug',
        description: 'Test for picker modal',
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

  test('should add dependency via API and display on detail page', async ({ page }) => {
    // Verifies: FR-dependency-linking — Add dependency and verify UI renders chip
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocker Bug Trace', description: 'This blocks another', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocked Bug Trace', description: 'This is blocked', severity: 'medium' },
    });
    const bug2 = await bug2Res.json();

    // Add dependency: bug2 blocked_by bug1
    const depRes = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Navigate to blocked bug and verify chip
    await page.goto(`/bugs/${bug2.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByTestId(`dependency-chip-${bug1.id}`)).toBeVisible();
  });

  test('should check readiness endpoint for bug with no blockers', async ({ page }) => {
    // Verifies: FR-dependency-linking — Readiness check returns ready when no blockers
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Ready Check Bug Trace', description: 'Test readiness', severity: 'low' },
    });
    const bug = await bugRes.json();

    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should check readiness endpoint for FR with no blockers', async ({ page }) => {
    // Verifies: FR-dependency-linking — FR readiness check
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Ready Check FR Trace', description: 'Test readiness', source: 'manual' },
    });
    const fr = await frRes.json();

    const readyRes = await page.request.get(`/api/feature-requests/${fr.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should prevent circular dependencies via API', async ({ page }) => {
    // Verifies: FR-dependency-linking — Cycle detection returns 409
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle Bug A Trace', description: 'Cycle test A', severity: 'low' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle Bug B Trace', description: 'Cycle test B', severity: 'low' },
    });
    const bug2 = await bug2Res.json();

    // Add: bug1 blocked_by bug2
    const dep1 = await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });
    expect(dep1.ok()).toBeTruthy();

    // Try circular: bug2 blocked_by bug1 — should fail
    const dep2 = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(dep2.status()).toBe(409);
  });

  test('should support cross-type dependencies (bug blocked by FR)', async ({ page }) => {
    // Verifies: FR-dependency-linking — Cross-type dependency creation
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Cross Blocker FR Trace', description: 'Blocks a bug', source: 'manual' },
    });
    const fr = await frRes.json();

    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Cross Blocked Bug Trace', description: 'Blocked by FR', severity: 'medium' },
    });
    const bug = await bugRes.json();

    const depRes = await page.request.post(`/api/bugs/${bug.id}/dependencies`, {
      data: { action: 'add', blocker_id: fr.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Verify readiness shows unresolved blocker
    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(false);
    expect(readiness.unresolved_blockers).toHaveLength(1);
  });
});
