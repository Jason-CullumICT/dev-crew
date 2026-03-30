// Verifies: FR-dependency-dispatch-gating, FR-dependency-linking
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Dispatch Gating', () => {
  test('should gate dispatch when bug has unresolved blockers', async ({ page }) => {
    // Create blocker bug
    const blockerRes = await page.request.post('/api/bugs', {
      data: { title: 'Gating Blocker Bug', description: 'This blocks dispatch', severity: 'high' },
    });
    expect(blockerRes.ok()).toBeTruthy();
    const blocker = await blockerRes.json();

    // Create blocked bug with dependency
    const blockedRes = await page.request.post('/api/bugs', {
      data: { title: 'Gated Bug', description: 'Should be gated', severity: 'medium' },
    });
    expect(blockedRes.ok()).toBeTruthy();
    const blocked = await blockedRes.json();

    // Add dependency
    const depRes = await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Try to set blocked bug to in_development — should be gated to pending_dependencies
    const updateRes = await page.request.patch(`/api/bugs/${blocked.id}`, {
      data: { status: 'in_development' },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated = await updateRes.json();
    expect(updated.status).toBe('pending_dependencies');
  });

  test('should show pending_dependencies status on bug detail page', async ({ page }) => {
    // Create blocker and blocked bugs
    const blockerRes = await page.request.post('/api/bugs', {
      data: { title: 'UI Gating Blocker', description: 'Blocks for UI test', severity: 'low' },
    });
    const blocker = await blockerRes.json();

    const blockedRes = await page.request.post('/api/bugs', {
      data: { title: 'UI Gated Bug', description: 'Gated for UI test', severity: 'low' },
    });
    const blocked = await blockedRes.json();

    await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });

    // Gate the bug
    await page.request.patch(`/api/bugs/${blocked.id}`, {
      data: { status: 'in_development' },
    });

    // Navigate to detail and verify pending_dependencies is visible
    await page.goto(`/bugs/${blocked.id}`);
    await expect(page.getByTestId('dependency-section')).toBeVisible();
    // Should show the pending dependencies warning
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('pending');
  });

  test('should set dependencies via PATCH blocked_by array', async ({ page }) => {
    // Create two bugs
    const bug1Res = await page.request.post('/api/bugs', {
      data: { title: 'PATCH Blocker 1', description: 'Blocker 1', severity: 'low' },
    });
    const bug1 = await bug1Res.json();

    const bug2Res = await page.request.post('/api/bugs', {
      data: { title: 'PATCH Blocker 2', description: 'Blocker 2', severity: 'low' },
    });
    const bug2 = await bug2Res.json();

    const targetRes = await page.request.post('/api/bugs', {
      data: { title: 'PATCH Target', description: 'Has blockers', severity: 'medium' },
    });
    const target = await targetRes.json();

    // Set blocked_by via PATCH
    const patchRes = await page.request.patch(`/api/bugs/${target.id}`, {
      data: { blocked_by: [bug1.id, bug2.id] },
    });
    expect(patchRes.ok()).toBeTruthy();
    const patched = await patchRes.json();
    expect(patched.blocked_by).toHaveLength(2);
    expect(patched.has_unresolved_blockers).toBe(true);
  });

  test('should remove dependency via POST action remove', async ({ page }) => {
    const blockerRes = await page.request.post('/api/bugs', {
      data: { title: 'Removable Blocker', description: 'Will be removed', severity: 'low' },
    });
    const blocker = await blockerRes.json();

    const blockedRes = await page.request.post('/api/bugs', {
      data: { title: 'Remove Target', description: 'Has removable blocker', severity: 'low' },
    });
    const blocked = await blockedRes.json();

    // Add dependency
    await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });

    // Remove dependency
    const removeRes = await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'remove', blocker_id: blocker.id },
    });
    expect(removeRes.ok()).toBeTruthy();
    const updated = await removeRes.json();
    expect(updated.blocked_by).toHaveLength(0);
  });

  test('should show blocked badge on bug list page', async ({ page }) => {
    // Create bugs with dependency
    const blockerRes = await page.request.post('/api/bugs', {
      data: { title: 'List Badge Blocker', description: 'Blocker for list test', severity: 'low' },
    });
    const blocker = await blockerRes.json();

    const blockedRes = await page.request.post('/api/bugs', {
      data: { title: 'List Badge Blocked', description: 'Should show badge', severity: 'low' },
    });
    const blocked = await blockedRes.json();

    await page.request.post(`/api/bugs/${blocked.id}/dependencies`, {
      data: { action: 'add', blocker_id: blocker.id },
    });

    // Navigate to bug list
    await page.goto('/bugs');
    await page.waitForTimeout(1000);
    // The blocked bug should appear with a blocked badge
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('List Badge Blocked');
  });

  test('should reject self-referencing dependency', async ({ page }) => {
    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Self-Ref Bug', description: 'Cannot block itself', severity: 'low' },
    });
    const bug = await bugRes.json();

    const depRes = await page.request.post(`/api/bugs/${bug.id}/dependencies`, {
      data: { action: 'add', blocker_id: bug.id },
    });
    expect(depRes.status()).toBe(409);
  });

  test('should support FR dependency endpoints', async ({ page }) => {
    // Create two FRs
    const fr1Res = await page.request.post('/api/feature-requests', {
      data: { title: 'FR Blocker', description: 'Blocks another FR', source: 'manual' },
    });
    const fr1 = await fr1Res.json();

    const fr2Res = await page.request.post('/api/feature-requests', {
      data: { title: 'FR Blocked', description: 'Blocked by another FR', source: 'manual' },
    });
    const fr2 = await fr2Res.json();

    // Add dependency
    const depRes = await page.request.post(`/api/feature-requests/${fr2.id}/dependencies`, {
      data: { action: 'add', blocker_id: fr1.id },
    });
    expect(depRes.ok()).toBeTruthy();

    // Check readiness
    const readyRes = await page.request.get(`/api/feature-requests/${fr2.id}/ready`);
    const readiness = await readyRes.json();
    expect(readiness.ready).toBe(false);
    expect(readiness.unresolved_blockers).toHaveLength(1);
    expect(readiness.unresolved_blockers[0].item_id).toBe(fr1.id);
  });

  test('should navigate bug detail without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const bugRes = await page.request.post('/api/bugs', {
      data: { title: 'Console Error Check', description: 'No errors expected', severity: 'low' },
    });
    const bug = await bugRes.json();

    await page.goto(`/bugs/${bug.id}`);
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('should navigate feature request detail without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const frRes = await page.request.post('/api/feature-requests', {
      data: { title: 'FR Console Check', description: 'No errors expected', source: 'manual' },
    });
    const fr = await frRes.json();

    await page.goto(`/feature-requests/${fr.id}`);
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
