// Verifies: dev-crew unified repo — Task 3 (docker-compose service topology)
// Tests that the compose services expose expected endpoints
import { test, expect } from '@playwright/test';

test.describe('Feature: Docker Compose Service Topology', () => {
  test('should serve the frontend at the configured baseURL', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  });

  test('should have a working backend API', async ({ request }) => {
    // The backend should serve API responses
    const response = await request.get('/api/work-items');
    // Accept 200 (data) or 404 (no items) but not 500
    expect([200, 404]).toContain(response.status());
  });

  test('should not have JavaScript errors on initial page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/');
    // Wait for any async errors
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('should return proper content-type headers for API', async ({ request }) => {
    const response = await request.get('/api/work-items');
    const contentType = response.headers()['content-type'] || '';
    if (response.status() === 200) {
      expect(contentType).toContain('application/json');
    }
  });
});
