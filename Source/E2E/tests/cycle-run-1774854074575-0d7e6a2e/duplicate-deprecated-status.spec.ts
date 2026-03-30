// Verifies: FR-DUP-01, FR-DUP-02, FR-DUP-03, FR-DUP-04, FR-DUP-05, FR-DUP-06, FR-DUP-07, FR-DUP-09, FR-DUP-10, FR-DUP-11, FR-DUP-12, FR-DUP-13
import { test, expect } from '@playwright/test';

test.describe('Feature: Duplicate/Deprecated Status for Bugs & Feature Requests', () => {

  test('should render the Bug Reports page with show hidden toggle', async ({ page }) => {
    // Verifies: FR-DUP-11
    await page.goto('/bugs');
    await expect(page.getByRole('heading', { name: 'Bug Reports' })).toBeVisible();
    await expect(page.getByLabel('Show hidden (duplicate/deprecated)')).toBeVisible();
  });

  test('should render the Feature Requests page with show hidden toggle', async ({ page }) => {
    // Verifies: FR-DUP-11
    await page.goto('/feature-requests');
    await expect(page.getByRole('heading', { name: 'Feature Requests' })).toBeVisible();
    await expect(page.getByLabel('Show hidden (duplicate/deprecated)')).toBeVisible();
  });

  test('should create a bug and mark it as deprecated via API', async ({ request }) => {
    // Verifies: FR-DUP-04
    // Create a bug
    const createRes = await request.post('/api/bugs', {
      data: { title: 'E2E Deprecated Bug', description: 'Test deprecated flow', severity: 'low' },
    });
    expect(createRes.ok()).toBeTruthy();
    const bug = await createRes.json();
    expect(bug.id).toMatch(/^BUG-/);

    // Mark as deprecated
    const deprecateRes = await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'deprecated', deprecation_reason: 'No longer relevant' },
    });
    expect(deprecateRes.ok()).toBeTruthy();
    const deprecated = await deprecateRes.json();
    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.deprecation_reason).toBe('No longer relevant');
  });

  test('should create two bugs and mark one as duplicate of the other', async ({ request }) => {
    // Verifies: FR-DUP-04, FR-DUP-03, FR-DUP-07
    const res1 = await request.post('/api/bugs', {
      data: { title: 'E2E Canonical Bug', description: 'The original', severity: 'high' },
    });
    const canonical = await res1.json();

    const res2 = await request.post('/api/bugs', {
      data: { title: 'E2E Duplicate Bug', description: 'A copy', severity: 'high' },
    });
    const dup = await res2.json();

    // Mark as duplicate
    const patchRes = await request.patch(`/api/bugs/${dup.id}`, {
      data: { status: 'duplicate', duplicate_of: canonical.id },
    });
    expect(patchRes.ok()).toBeTruthy();
    const patched = await patchRes.json();
    expect(patched.status).toBe('duplicate');
    expect(patched.duplicate_of).toBe(canonical.id);

    // Canonical should have duplicated_by
    const getRes = await request.get(`/api/bugs/${canonical.id}`);
    const canonicalFull = await getRes.json();
    expect(canonicalFull.duplicated_by).toContain(dup.id);
  });

  test('should hide duplicate bugs from list by default', async ({ request }) => {
    // Verifies: FR-DUP-05
    const res1 = await request.post('/api/bugs', {
      data: { title: 'E2E Visible Bug', description: 'Should be visible', severity: 'low' },
    });
    const visible = await res1.json();

    const res2 = await request.post('/api/bugs', {
      data: { title: 'E2E Hidden Bug', description: 'Will be hidden', severity: 'low' },
    });
    const hidden = await res2.json();

    await request.patch(`/api/bugs/${hidden.id}`, {
      data: { status: 'duplicate', duplicate_of: visible.id },
    });

    // Default list should NOT contain the duplicate
    const listRes = await request.get('/api/bugs');
    const list = await listRes.json();
    const ids = list.data.map((b: any) => b.id);
    expect(ids).toContain(visible.id);
    expect(ids).not.toContain(hidden.id);

    // With include_hidden=true should contain both
    const listAllRes = await request.get('/api/bugs?include_hidden=true');
    const listAll = await listAllRes.json();
    const allIds = listAll.data.map((b: any) => b.id);
    expect(allIds).toContain(visible.id);
    expect(allIds).toContain(hidden.id);
  });

  test('should reject self-referencing duplicate_of', async ({ request }) => {
    // Verifies: FR-DUP-07
    const res = await request.post('/api/bugs', {
      data: { title: 'E2E Self Ref Bug', description: 'Testing self-ref', severity: 'low' },
    });
    const bug = await res.json();

    const patchRes = await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'duplicate', duplicate_of: bug.id },
    });
    expect(patchRes.status()).toBe(400);
    const body = await patchRes.json();
    expect(body.error).toContain('cannot be a duplicate of itself');
  });

  test('should reject missing duplicate_of when status is duplicate', async ({ request }) => {
    // Verifies: FR-DUP-04
    const res = await request.post('/api/bugs', {
      data: { title: 'E2E Missing DupOf', description: 'Testing', severity: 'low' },
    });
    const bug = await res.json();

    const patchRes = await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'duplicate' },
    });
    expect(patchRes.status()).toBe(400);
    const body = await patchRes.json();
    expect(body.error).toContain('duplicate_of is required');
  });

  test('should block transitions out of terminal statuses', async ({ request }) => {
    // Verifies: FR-DUP-04
    const res1 = await request.post('/api/bugs', {
      data: { title: 'E2E Terminal Bug Canon', description: 'canon', severity: 'low' },
    });
    const canon = await res1.json();

    const res2 = await request.post('/api/bugs', {
      data: { title: 'E2E Terminal Bug', description: 'will be terminal', severity: 'low' },
    });
    const bug = await res2.json();

    await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'duplicate', duplicate_of: canon.id },
    });

    const revertRes = await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'reported' },
    });
    expect(revertRes.status()).toBe(400);
  });

  test('should create FR and mark as duplicate', async ({ request }) => {
    // Verifies: FR-DUP-04 for feature requests
    const res1 = await request.post('/api/feature-requests', {
      data: { title: 'E2E Canonical FR', description: 'The original FR' },
    });
    const canonical = await res1.json();

    const res2 = await request.post('/api/feature-requests', {
      data: { title: 'E2E Duplicate FR', description: 'A copy FR' },
    });
    const dup = await res2.json();

    const patchRes = await request.patch(`/api/feature-requests/${dup.id}`, {
      data: { status: 'duplicate', duplicate_of: canonical.id },
    });
    expect(patchRes.ok()).toBeTruthy();
    const patched = await patchRes.json();
    expect(patched.status).toBe('duplicate');
    expect(patched.duplicate_of).toBe(canonical.id);
  });

  test('should hide duplicate/deprecated FRs from list by default', async ({ request }) => {
    // Verifies: FR-DUP-05
    const res1 = await request.post('/api/feature-requests', {
      data: { title: 'E2E Visible FR', description: 'Should be visible' },
    });
    const visible = await res1.json();

    const res2 = await request.post('/api/feature-requests', {
      data: { title: 'E2E Deprecated FR', description: 'Will be deprecated' },
    });
    const hidden = await res2.json();

    await request.patch(`/api/feature-requests/${hidden.id}`, {
      data: { status: 'deprecated', deprecation_reason: 'Superseded' },
    });

    // Default list should NOT contain deprecated
    const listRes = await request.get('/api/feature-requests');
    const list = await listRes.json();
    const ids = list.data.map((f: any) => f.id);
    expect(ids).toContain(visible.id);
    expect(ids).not.toContain(hidden.id);

    // With include_hidden=true
    const listAllRes = await request.get('/api/feature-requests?include_hidden=true');
    const listAll = await listAllRes.json();
    const allIds = listAll.data.map((f: any) => f.id);
    expect(allIds).toContain(visible.id);
    expect(allIds).toContain(hidden.id);
  });

  test('should always return full item on detail endpoint', async ({ request }) => {
    // Verifies: FR-DUP-06
    const res = await request.post('/api/bugs', {
      data: { title: 'E2E Detail Bug', description: 'desc', severity: 'low' },
    });
    const bug = await res.json();
    await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'deprecated', deprecation_reason: 'Testing detail' },
    });

    const getRes = await request.get(`/api/bugs/${bug.id}`);
    expect(getRes.ok()).toBeTruthy();
    const detail = await getRes.json();
    expect(detail.id).toBe(bug.id);
    expect(detail.status).toBe('deprecated');
    expect(detail.deprecation_reason).toBe('Testing detail');
  });

  test('Bug Reports page toggle shows hidden items in UI', async ({ page, request }) => {
    // Verifies: FR-DUP-11
    // Create a bug and deprecate it
    const res = await request.post('/api/bugs', {
      data: { title: 'E2E UI Hidden Bug', description: 'desc', severity: 'low' },
    });
    const bug = await res.json();
    await request.patch(`/api/bugs/${bug.id}`, {
      data: { status: 'deprecated', deprecation_reason: 'UI test' },
    });

    // Navigate to bugs page - hidden bug should NOT appear
    await page.goto('/bugs');
    await page.waitForSelector('[class*="space-y"]');

    // Toggle show hidden
    await page.getByLabel('Show hidden (duplicate/deprecated)').check();
    // Wait for refetch
    await page.waitForTimeout(500);

    // The deprecated bug should now be visible (check for its title)
    await expect(page.getByText('E2E UI Hidden Bug')).toBeVisible();
  });

  test('Feature Requests page toggle shows hidden items in UI', async ({ page, request }) => {
    // Verifies: FR-DUP-11
    const res1 = await request.post('/api/feature-requests', {
      data: { title: 'E2E UI Canon FR', description: 'The canonical' },
    });
    const canon = await res1.json();

    const res2 = await request.post('/api/feature-requests', {
      data: { title: 'E2E UI Dup FR', description: 'A dup FR' },
    });
    const dup = await res2.json();

    await request.patch(`/api/feature-requests/${dup.id}`, {
      data: { status: 'duplicate', duplicate_of: canon.id },
    });

    await page.goto('/feature-requests');
    await page.waitForSelector('[class*="space-y"]');

    // Toggle show hidden
    await page.getByLabel('Show hidden (duplicate/deprecated)').check();
    await page.waitForTimeout(500);

    await expect(page.getByText('E2E UI Dup FR')).toBeVisible();
  });

  test('no console errors during navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/bugs');
    await page.waitForTimeout(500);

    await page.goto('/feature-requests');
    await page.waitForTimeout(500);

    // Filter out known non-critical errors (e.g., 404s for favicon)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load resource')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
