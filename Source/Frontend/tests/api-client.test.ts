// Verifies: FR-dependency-api-client

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { workItemsApi } from '../src/api/client';

// Stub the global fetch used by the API client
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeFetchResponse<T>(body: T, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('workItemsApi — dependency methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── addDependency ────────────────────────────────────────────────────────────

  // Verifies: FR-dependency-api-client — addDependency calls POST with action=add
  it('addDependency calls POST /work-items/:id/dependencies with {action:add, blockerId}', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ id: 'item-1' }));

    await workItemsApi.addDependency('item-1', 'blocker-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-items/item-1/dependencies'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'add', blockerId: 'blocker-1' }),
      }),
    );
  });

  // Verifies: FR-dependency-api-client — addDependency throws on API error
  it('addDependency throws when the API returns an error response', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Circular dependency detected' }),
      } as Response),
    );

    await expect(workItemsApi.addDependency('item-1', 'blocker-1')).rejects.toThrow(
      'Circular dependency detected',
    );
  });

  // ─── removeDependency ─────────────────────────────────────────────────────────

  // Verifies: FR-dependency-api-client — removeDependency calls POST with action=remove
  it('removeDependency calls POST /work-items/:id/dependencies with {action:remove, blockerId}', async () => {
    mockFetch.mockReturnValue(makeFetchResponse(undefined, 204));

    await workItemsApi.removeDependency('item-1', 'blocker-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-items/item-1/dependencies'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'remove', blockerId: 'blocker-1' }),
      }),
    );
  });

  // ─── setDependencies ──────────────────────────────────────────────────────────

  // Verifies: FR-dependency-api-client — setDependencies calls PATCH with {blockedBy: ids}
  it('setDependencies calls PATCH /work-items/:id with blockedBy array', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ id: 'item-1' }));

    await workItemsApi.setDependencies('item-1', ['b-1', 'b-2']);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-items/item-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ blockedBy: ['b-1', 'b-2'] }),
      }),
    );
  });

  // Verifies: FR-dependency-api-client — setDependencies with empty array clears all blockers
  it('setDependencies with empty array calls PATCH with {blockedBy:[]}', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ id: 'item-1' }));

    await workItemsApi.setDependencies('item-1', []);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-items/item-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ blockedBy: [] }),
      }),
    );
  });

  // ─── checkReady ───────────────────────────────────────────────────────────────

  // Verifies: FR-dependency-api-client — checkReady calls GET /work-items/:id/ready
  it('checkReady calls GET /work-items/:id/ready', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ ready: true }));

    const result = await workItemsApi.checkReady('item-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-items/item-1/ready'),
      expect.any(Object),
    );
    expect(result.ready).toBe(true);
  });

  // Verifies: FR-dependency-api-client — checkReady returns ready=false with unresolved blockers
  it('checkReady returns {ready:false, unresolvedBlockers} when item is blocked', async () => {
    const unresolvedBlockers = [
      {
        blockedItemId: 'item-1',
        blockedItemDocId: 'WI-001',
        blockerItemId: 'blocker-1',
        blockerItemDocId: 'WI-002',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockFetch.mockReturnValue(
      makeFetchResponse({ ready: false, unresolvedBlockers }),
    );

    const result = await workItemsApi.checkReady('item-1');

    expect(result.ready).toBe(false);
    expect(result.unresolvedBlockers).toHaveLength(1);
    expect(result.unresolvedBlockers![0].blockerItemId).toBe('blocker-1');
  });

  // Verifies: FR-dependency-api-client — checkReady throws on 404
  it('checkReady throws an error for a non-existent item (404)', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Work item not found' }),
      } as Response),
    );

    await expect(workItemsApi.checkReady('non-existent')).rejects.toThrow(
      'Work item not found',
    );
  });

  // ─── searchItems ──────────────────────────────────────────────────────────────

  // Verifies: FR-dependency-api-client — searchItems calls GET /search?q=<query>
  it('searchItems calls GET /search?q=<query>', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    await workItemsApi.searchItems('auth');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=auth'),
      expect.any(Object),
    );
  });

  // Verifies: FR-dependency-api-client — searchItems returns {data: WorkItem[]} wrapper
  it('searchItems returns a {data: [...]} response wrapper', async () => {
    const mockItems = [
      {
        id: 'item-1',
        docId: 'WI-099',
        title: 'Auth module feature',
        type: 'feature',
      },
    ];
    mockFetch.mockReturnValue(makeFetchResponse({ data: mockItems }));

    const result = await workItemsApi.searchItems('auth');

    expect(result).toHaveProperty('data');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('item-1');
  });

  // Verifies: FR-dependency-api-client — searchItems returns empty data for no matches
  it('searchItems returns empty data array when no items match', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    const result = await workItemsApi.searchItems('zzznomatch');

    expect(result.data).toHaveLength(0);
  });

  // ─── searchItems — special character URL encoding ─────────────────────────
  // Fixes: FIX-search-special-chars — frontend must percent-encode %, _, [ so the
  // backend never receives raw SQLite-LIKE special characters in the query string.

  // Fixes: FIX-search-special-chars — percent sign is encoded as %25
  it('searchItems URL-encodes % as %25 so the backend receives a safe query string', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    await workItemsApi.searchItems('%');

    const calledUrl: string = (mockFetch.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('%25');
    expect(calledUrl).not.toMatch(/search\?q=%$/); // raw % never reaches server
  });

  // Fixes: FIX-search-special-chars — opening bracket is encoded as %5B
  it('searchItems URL-encodes [ as %5B so the backend receives a safe query string', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    await workItemsApi.searchItems('[');

    const calledUrl: string = (mockFetch.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('%5B');
  });

  // Fixes: FIX-search-special-chars — underscore passes through and is safely transmitted
  it('searchItems transmits _ without breaking the URL', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    await workItemsApi.searchItems('_');

    const calledUrl: string = (mockFetch.mock.calls[0] as [string])[0];
    // URLSearchParams leaves _ as-is (it is safe in query strings)
    expect(calledUrl).toMatch(/[?&]q=_/);
  });

  // Fixes: FIX-search-special-chars — combined special chars are all encoded
  it('searchItems encodes a query containing %, _, and [ together', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ data: [] }));

    await workItemsApi.searchItems('%_[test');

    const calledUrl: string = (mockFetch.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('%25');   // % → %25
    expect(calledUrl).toContain('_');     // _ stays as _
    expect(calledUrl).toContain('%5B');   // [ → %5B
  });
});
