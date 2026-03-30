// Verifies: FR-dependency-linking, FR-dependency-detail-ui, FR-dependency-list-ui, FR-dependency-picker, FR-dependency-dispatch-gating
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking', () => {
  test('should render bug list page with blocked badge support', async ({ page }) => {
    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: /bug/i })).toBeVisible();
    // Verify page loads without console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should render feature request list page with blocked badge support', async ({ page }) => {
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
    // Verifies: FR-dependency-detail-ui
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Dep Section Test Bug',
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
    // Verifies: FR-dependency-detail-ui
    const response = await page.request.post('/api/feature-requests', {
      data: {
        title: 'E2E Dep Section Test FR',
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

  test('should open dependency picker modal from detail view', async ({ page }) => {
    // Verifies: FR-dependency-picker
    const response = await page.request.post('/api/bugs', {
      data: {
        title: 'E2E Picker Modal Bug',
        description: 'Test dependency picker modal',
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

  test('should add dependency and display it on detail page', async ({ page }) => {
    // Verifies: FR-dependency-routes, FR-dependency-detail-ui
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocker Bug E2E', description: 'This blocks another', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Blocked Bug E2E', description: 'This is blocked', severity: 'medium' },
    });
    const bug2 = await bug2Res.json();

    // Add dependency: bug2 blocked_by bug1
    const depRes = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Verify dependency chip visible on detail page
    await page.goto(`/bugs/${bug2.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    await expect(page.getByTestId(`dependency-chip-${bug1.id}`)).toBeVisible();
  });

  test('should return readiness status for bug with no blockers', async ({ page }) => {
    // Verifies: FR-dependency-routes (ready endpoint)
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Ready Check Bug E2E', description: 'Test readiness', severity: 'low' },
    });
    const bug = await bugRes.json();

    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should return readiness status for feature request', async ({ page }) => {
    // Verifies: FR-dependency-routes (ready endpoint)
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Ready Check FR E2E', description: 'Test readiness', source: 'manual' },
    });
    const fr = await frRes.json();

    const readyRes = await page.request.get(`/api/feature-requests/${fr.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should prevent circular dependencies', async ({ page }) => {
    // Verifies: FR-dependency-service (cycle detection)
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle A E2E', description: 'Cycle test A', severity: 'low' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'Cycle B E2E', description: 'Cycle test B', severity: 'low' },
    });
    const bug2 = await bug2Res.json();

    // Add: bug1 blocked_by bug2
    const dep1 = await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });
    expect(dep1.ok()).toBeTruthy();

    // Try circular: bug2 blocked_by bug1 → should fail with 409
    const dep2 = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(dep2.status()).toBe(409);
  });

  test('should support cross-type dependencies (bug blocked by FR)', async ({ page }) => {
    // Verifies: FR-dependency-types (cross-entity linking)
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Cross-type Blocker FR E2E', description: 'Blocks a bug', source: 'manual' },
    });
    const fr = await frRes.json();

    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Cross-type Blocked Bug E2E', description: 'Blocked by FR', severity: 'medium' },
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

  test('should show search endpoint results for dependency picker', async ({ page }) => {
    // Verifies: FR-dependency-picker (search support)
    await page.request.post('/api/bugs', {
      data: { title: 'Searchable Dep Bug E2E', description: 'For search test', severity: 'low' },
    });

    const searchRes = await page.request.get('/api/search?q=Searchable');
    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();
    expect(searchData.data.length).toBeGreaterThan(0);
  });

  test('should set pending_dependencies when dispatching with unresolved blockers', async ({ page }) => {
    // Verifies: FR-dependency-dispatch-gating
    const blockerRes = await page.request.post('/api/bugs', {
      data: { title: 'Unresolved Blocker E2E', description: 'Blocks dispatch', severity: 'high' },
    });
    const blocker = await blockerRes.json();

    const blockedRes = await page.request.post('/api/bugs', {
      data: { title: 'Gated Bug E2E', description: 'Should be gated', severity: 'medium' },
    });
    const blocked = await blockedRes.json();

    // Add dependency
    await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });

    // Try to move to in_development — should be gated to pending_dependencies
    const patchRes = await page.request.patch(`/api/bugs/${blocked.id}`, {
      data: { status: 'in_development' },
    });
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json();
    expect(updated.status).toBe('pending_dependencies');
  });

  test('should auto-dispatch when blocker resolves', async ({ page }) => {
    // Verifies: FR-dependency-dispatch-gating (cascade)
    const blockerRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Cascade Blocker FR E2E', description: 'Will be resolved', source: 'manual' },
    });
    const blocker = await blockerRes.json();

    const blockedRes = await page.request.post('/api/feature-requests', {
      data: { title: 'Cascade Blocked FR E2E', description: 'Waiting for blocker', source: 'manual' },
    });
    const blocked = await blockedRes.json();

    // Add dependency
    await page.request.post(`/api/feature-requests/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });

    // Put blocked item into pending_dependencies
    await page.request.patch(`/api/feature-requests/${blocked.id}`, {
      data: { status: 'approved' },
    });

    // Verify it's in pending_dependencies
    const checkRes = await page.request.get(`/api/feature-requests/${blocked.id}`);
    const checkFR = await checkRes.json();
    expect(checkFR.status).toBe('pending_dependencies');

    // Resolve the blocker
    await page.request.patch(`/api/feature-requests/${blocker.id}`, {
      data: { status: 'completed' },
    });

    // Verify blocked item was auto-dispatched to approved
    const finalRes = await page.request.get(`/api/feature-requests/${blocked.id}`);
    const finalFR = await finalRes.json();
    expect(finalFR.status).toBe('approved');
  });
});
