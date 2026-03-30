// Verifies: FR-dependency-linking, FR-dependency-ready-check, FR-dependency-dispatch-gating
import { test, expect } from '@playwright/test';

test.describe('Feature: Dependency API Endpoints', () => {
  test('should return search results from /api/search', async ({ request }) => {
    const response = await request.get('/api/search?q=');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should return search results filtered by query', async ({ request }) => {
    const response = await request.get('/api/search?q=test');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should return bug list with has_unresolved_blockers field', async ({ request }) => {
    const response = await request.get('/api/bugs');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('data');

    if (body.data.length > 0) {
      // Each bug should have has_unresolved_blockers field
      expect(body.data[0]).toHaveProperty('has_unresolved_blockers');
      expect(typeof body.data[0].has_unresolved_blockers).toBe('boolean');
    }
  });

  test('should return feature request list with has_unresolved_blockers field', async ({ request }) => {
    const response = await request.get('/api/feature-requests');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('data');

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('has_unresolved_blockers');
      expect(typeof body.data[0].has_unresolved_blockers).toBe('boolean');
    }
  });

  test('should return bug detail with dependency fields', async ({ request }) => {
    // First get the bug list
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();

    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.get(`/api/bugs/${bugId}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toHaveProperty('blocked_by');
      expect(body).toHaveProperty('blocks');
      expect(body).toHaveProperty('has_unresolved_blockers');
      expect(Array.isArray(body.blocked_by)).toBeTruthy();
      expect(Array.isArray(body.blocks)).toBeTruthy();
    }
  });

  test('should return feature request detail with dependency fields', async ({ request }) => {
    const listResponse = await request.get('/api/feature-requests');
    const listBody = await listResponse.json();

    if (listBody.data.length > 0) {
      const frId = listBody.data[0].id;
      const response = await request.get(`/api/feature-requests/${frId}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toHaveProperty('blocked_by');
      expect(body).toHaveProperty('blocks');
      expect(body).toHaveProperty('has_unresolved_blockers');
    }
  });

  test('should return readiness check for bug', async ({ request }) => {
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

  test('should return readiness check for feature request', async ({ request }) => {
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

  test('should reject invalid dependency actions', async ({ request }) => {
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

  test('should reject self-referential dependency', async ({ request }) => {
    const listResponse = await request.get('/api/bugs');
    const listBody = await listResponse.json();

    if (listBody.data.length > 0) {
      const bugId = listBody.data[0].id;
      const response = await request.post(`/api/bugs/${bugId}/dependencies`, {
        data: { action: 'add', blocker_id: bugId },
      });
      // Should be 409 (self-reference) or 400
      expect([400, 409]).toContain(response.status());
    }
  });
});
