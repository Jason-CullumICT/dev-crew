// Verifies: FR-dependency-linking — E2E API tests for dependency linking endpoints
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency Linking - API Endpoints', () => {
  test('GET /api/bugs should return bugs with has_unresolved_blockers field', async ({ request }) => {
    const response = await request.get('/api/bugs');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('has_unresolved_blockers');
      expect(body.data[0]).toHaveProperty('blocked_by');
      expect(body.data[0]).toHaveProperty('blocks');
    }
  });

  test('GET /api/feature-requests should return feature requests with dependency fields', async ({ request }) => {
    const response = await request.get('/api/feature-requests');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('has_unresolved_blockers');
      expect(body.data[0]).toHaveProperty('blocked_by');
      expect(body.data[0]).toHaveProperty('blocks');
    }
  });

  test('GET /api/bugs/:id should return bug with full dependency info', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.get(`/api/bugs/${bugId}`);
      expect(response.ok()).toBeTruthy();
      const bug = await response.json();
      expect(bug).toHaveProperty('blocked_by');
      expect(bug).toHaveProperty('blocks');
      expect(bug).toHaveProperty('has_unresolved_blockers');
      expect(Array.isArray(bug.blocked_by)).toBeTruthy();
      expect(Array.isArray(bug.blocks)).toBeTruthy();
    }
  });

  test('GET /api/bugs/:id should return 404 for non-existent bug', async ({ request }) => {
    const response = await request.get('/api/bugs/BUG-9999');
    expect(response.status()).toBe(404);
  });

  test('GET /api/bugs/:id/ready should return readiness check', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.get(`/api/bugs/${bugId}/ready`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body).toHaveProperty('ready');
      expect(body).toHaveProperty('unresolved_blockers');
      expect(typeof body.ready).toBe('boolean');
      expect(Array.isArray(body.unresolved_blockers)).toBeTruthy();
    }
  });

  test('GET /api/feature-requests/:id/ready should return readiness check', async ({ request }) => {
    const listResponse = await request.get('/api/feature-requests');
    const listBody = await listResponse.json();
    if (listBody.data.length > 0) {
      const frId = listBody.data[0].id;
      const response = await request.get(`/api/feature-requests/${frId}/ready`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body).toHaveProperty('ready');
      expect(body).toHaveProperty('unresolved_blockers');
    }
  });

  test('POST /api/bugs/:id/dependencies should reject invalid blocker_id format', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.post(`/api/bugs/${bugId}/dependencies`, {
        data: { action: 'add', blocker_id: 'INVALID-FORMAT' },
      });
      expect(response.status()).toBe(400);
    }
  });

  test('POST /api/bugs/:id/dependencies should reject missing fields', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.post(`/api/bugs/${bugId}/dependencies`, {
        data: {},
      });
      expect(response.status()).toBe(400);
    }
  });

  test('GET /api/bugs?q=search should support search query parameter', async ({ request }) => {
    const response = await request.get('/api/bugs?q=test');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('GET /api/feature-requests?q=search should support search query parameter', async ({ request }) => {
    const response = await request.get('/api/feature-requests?q=test');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('dependency link data should contain required fields', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();
    for (const bug of listBody.data) {
      for (const dep of bug.blocked_by) {
        expect(dep).toHaveProperty('item_type');
        expect(dep).toHaveProperty('item_id');
        expect(dep).toHaveProperty('title');
        expect(dep).toHaveProperty('status');
        expect(['bug', 'feature_request']).toContain(dep.item_type);
      }
      for (const dep of bug.blocks) {
        expect(dep).toHaveProperty('item_type');
        expect(dep).toHaveProperty('item_id');
        expect(dep).toHaveProperty('title');
        expect(dep).toHaveProperty('status');
      }
    }
  });
});
