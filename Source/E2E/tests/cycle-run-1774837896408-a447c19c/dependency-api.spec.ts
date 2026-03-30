// Verifies: FR-0001 — E2E tests for dependency linking API via browser
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking - API Verification', () => {

  test('GET /api/bugs returns data array with dependency fields', async ({ request }) => {
    const response = await request.get('/api/bugs');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();

    if (body.data.length > 0) {
      const bug = body.data[0];
      expect(bug).toHaveProperty('id');
      expect(bug).toHaveProperty('title');
      expect(bug).toHaveProperty('status');
      expect(bug).toHaveProperty('blocked_by');
      expect(bug).toHaveProperty('blocks');
      expect(bug).toHaveProperty('has_unresolved_blockers');
      expect(Array.isArray(bug.blocked_by)).toBeTruthy();
      expect(Array.isArray(bug.blocks)).toBeTruthy();
      expect(typeof bug.has_unresolved_blockers).toBe('boolean');
    }
  });

  test('GET /api/feature-requests returns data array with dependency fields', async ({ request }) => {
    const response = await request.get('/api/feature-requests');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();

    if (body.data.length > 0) {
      const fr = body.data[0];
      expect(fr).toHaveProperty('id');
      expect(fr).toHaveProperty('blocked_by');
      expect(fr).toHaveProperty('blocks');
      expect(fr).toHaveProperty('has_unresolved_blockers');
    }
  });

  test('GET /api/bugs/:id returns single bug with dependency arrays', async ({ request }) => {
    // First get the list to find a valid ID
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length === 0) {
      test.skip();
      return;
    }

    const bugId = listBody.data[0].id;
    const response = await request.get(`/api/bugs/${bugId}`);
    expect(response.status()).toBe(200);
    const bug = await response.json();
    expect(bug.id).toBe(bugId);
    expect(bug).toHaveProperty('blocked_by');
    expect(bug).toHaveProperty('blocks');
  });

  test('GET /api/bugs/:id/ready returns readiness check', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length === 0) {
      test.skip();
      return;
    }

    const bugId = listBody.data[0].id;
    const response = await request.get(`/api/bugs/${bugId}/ready`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('ready');
    expect(body).toHaveProperty('unresolved_blockers');
    expect(typeof body.ready).toBe('boolean');
    expect(Array.isArray(body.unresolved_blockers)).toBeTruthy();
  });

  test('GET /api/feature-requests/:id/ready returns readiness check', async ({ request }) => {
    const listResponse = await request.get('/api/feature-requests');
    const listBody = await listResponse.json();
    if (listBody.data.length === 0) {
      test.skip();
      return;
    }

    const frId = listBody.data[0].id;
    const response = await request.get(`/api/feature-requests/${frId}/ready`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('ready');
    expect(typeof body.ready).toBe('boolean');
  });

  test('GET /api/bugs/NONEXISTENT/ready returns 404', async ({ request }) => {
    const response = await request.get('/api/bugs/BUG-99999/ready');
    expect(response.status()).toBe(404);
  });

  test('POST /api/bugs/:id/dependencies rejects invalid format', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length === 0) {
      test.skip();
      return;
    }

    const bugId = listBody.data[0].id;
    const response = await request.post(`/api/bugs/${bugId}/dependencies`, {
      data: { action: 'add', blocker_id: 'INVALID-FORMAT' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/bugs/:id/dependencies rejects missing fields', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length === 0) {
      test.skip();
      return;
    }

    const bugId = listBody.data[0].id;
    const response = await request.post(`/api/bugs/${bugId}/dependencies`, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('GET /api/bugs supports search query parameter', async ({ request }) => {
    const response = await request.get('/api/bugs?q=test');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /api/feature-requests supports search query parameter', async ({ request }) => {
    const response = await request.get('/api/feature-requests?q=test');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('dependency links include title and status fields', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();

    // Find a bug that has blockers
    const bugWithBlockers = listBody.data.find(
      (b: { blocked_by: unknown[] }) => b.blocked_by && b.blocked_by.length > 0,
    );

    if (!bugWithBlockers) {
      test.skip();
      return;
    }

    const blocker = bugWithBlockers.blocked_by[0];
    expect(blocker).toHaveProperty('item_type');
    expect(blocker).toHaveProperty('item_id');
    expect(blocker).toHaveProperty('title');
    expect(blocker).toHaveProperty('status');
    expect(['bug', 'feature_request']).toContain(blocker.item_type);
  });
});
