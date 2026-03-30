// Verifies: FR-dependency-dispatch-gating, FR-dependency-ready-check
// E2E tests for dispatch gating and cascade auto-dispatch
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Dispatch Gating', () => {
  test('should check readiness endpoint for bug with no blockers', async ({ page }) => {
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'E2E Ready Check Bug', description: 'Test readiness', severity: 'low' },
    });
    const bug = await bugRes.json();

    const readyRes = await page.request.get(`/api/bugs/${bug.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
    expect(readiness.unresolved_blockers).toHaveLength(0);
  });

  test('should check readiness endpoint for FR with no blockers', async ({ page }) => {
    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'E2E Ready Check FR', description: 'Test readiness', source: 'manual' },
    });
    const fr = await frRes.json();

    const readyRes = await page.request.get(`/api/feature-requests/${fr.id}/ready`);
    expect(readyRes.ok()).toBeTruthy();
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(true);
  });

  test('should gate dispatch when bug has unresolved blockers', async ({ page }) => {
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Gated Bug', description: 'Will be gated', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Blocker Bug', description: 'Blocks the first', severity: 'medium' },
    });
    const bug2 = await bug2Res.json();

    // Add dependency: bug1 blocked_by bug2
    await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });

    // Try to move to in_development — should be gated to pending_dependencies
    const patchRes = await page.request.patch(`/api/bugs/${bug1.id}`, {
      data: { status: 'in_development' },
    });
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json();
    expect(updated.status).toBe('pending_dependencies');
  });

  test('should auto-dispatch pending_dependencies items when blocker resolves', async ({ page }) => {
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Auto-dispatch Bug', description: 'Will be auto-dispatched', severity: 'high' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Cascade Blocker', description: 'Will be resolved', severity: 'medium' },
    });
    const bug2 = await bug2Res.json();

    // Set dependency and trigger gating
    await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });
    await page.request.patch(`/api/bugs/${bug1.id}`, {
      data: { status: 'in_development' },
    });

    // Verify bug1 is pending_dependencies
    const pendingRes = await page.request.get(`/api/bugs/${bug1.id}`);
    const pending = await pendingRes.json();
    expect(pending.status).toBe('pending_dependencies');

    // Resolve the blocker
    await page.request.patch(`/api/bugs/${bug2.id}`, {
      data: { status: 'resolved' },
    });

    // bug1 should now be auto-dispatched to approved
    const afterRes = await page.request.get(`/api/bugs/${bug1.id}`);
    const after = await afterRes.json();
    expect(after.status).toBe('approved');
  });

  test('should prevent circular dependencies', async ({ page }) => {
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Cycle A', description: 'Cycle test', severity: 'low' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'E2E Cycle B', description: 'Cycle test', severity: 'low' },
    });
    const bug2 = await bug2Res.json();

    // Add: bug1 blocked_by bug2
    const dep1 = await page.request.post(`/api/bugs/${bug1.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug2.id },
    });
    expect(dep1.ok()).toBeTruthy();

    // Try reverse: bug2 blocked_by bug1 — should fail with 409
    const dep2 = await page.request.post(`/api/bugs/${bug2.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug1.id },
    });
    expect(dep2.status()).toBe(409);
  });

  test('should reject self-reference dependency', async ({ page }) => {
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'E2E Self-ref Bug', description: 'Cannot block itself', severity: 'low' },
    });
    const bug = await bugRes.json();

    const depRes = await page.request.post(`/api/bugs/${bug.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug.id },
    });
    expect(depRes.status()).toBe(409);
  });

  test('should set dependencies via PATCH blocked_by array', async ({ page }) => {
    const fr1Res = await page.request.post('/api/feature-requests', {
      data: { title: 'E2E PATCH Dep FR 1', description: 'Main item', source: 'manual' },
    });
    const fr1 = await fr1Res.json();

    const fr2Res = await page.request.post('/api/feature-requests', {
      data: { title: 'E2E PATCH Dep FR 2', description: 'Blocker item', source: 'manual' },
    });
    const fr2 = await fr2Res.json();

    const patchRes = await page.request.patch(`/api/feature-requests/${fr1.id}`, {
      data: { blocked_by: [fr2.id] },
    });
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json();
    expect(updated.blocked_by).toHaveLength(1);
    expect(updated.blocked_by[0].item_id).toBe(fr2.id);
  });

  test('should show search endpoint results', async ({ page }) => {
    await page.request.post('/api/bugs', {
      data: { title: 'E2E Searchable Bug XYZ123', description: 'For search test', severity: 'low' },
    });

    const searchRes = await page.request.get('/api/search?q=XYZ123');
    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();
    expect(searchData.data.length).toBeGreaterThan(0);
  });

  test('should navigate bug list and detail without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: /bug/i })).toBeVisible();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
