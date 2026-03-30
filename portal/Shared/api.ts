// Verifies: FR-0001 — API client for portal dependency linking
import type {
  Bug,
  FeatureRequest,
  DependencyLink,
  DependencyItemType,
  DependencyActionRequest,
  ListResponse,
  ReadyResponse,
} from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// --- Bug endpoints ---

export async function getBugs(): Promise<ListResponse<Bug>> {
  return request<ListResponse<Bug>>('/bugs');
}

export async function getBug(id: string): Promise<Bug> {
  return request<Bug>(`/bugs/${encodeURIComponent(id)}`);
}

export async function updateBug(id: string, data: Partial<Bug>): Promise<Bug> {
  return request<Bug>(`/bugs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// --- Feature Request endpoints ---

export async function getFeatureRequests(): Promise<ListResponse<FeatureRequest>> {
  return request<ListResponse<FeatureRequest>>('/feature-requests');
}

export async function getFeatureRequest(id: string): Promise<FeatureRequest> {
  return request<FeatureRequest>(`/feature-requests/${encodeURIComponent(id)}`);
}

export async function updateFeatureRequest(id: string, data: Partial<FeatureRequest>): Promise<FeatureRequest> {
  return request<FeatureRequest>(`/feature-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// --- Dependency endpoints --- // Verifies: FR-0001

function itemTypeToRoute(itemType: DependencyItemType): string {
  return itemType === 'bug' ? 'bugs' : 'feature-requests';
}

/** Add a single dependency link */
export async function addDependency(
  itemType: DependencyItemType,
  itemId: string,
  blockerId: string,
): Promise<void> {
  const route = itemTypeToRoute(itemType);
  await request<void>(`/${route}/${encodeURIComponent(itemId)}/dependencies`, {
    method: 'POST',
    body: JSON.stringify({ action: 'add', blocker_id: blockerId } satisfies DependencyActionRequest),
  });
}

/** Remove a single dependency link */
export async function removeDependency(
  itemType: DependencyItemType,
  itemId: string,
  blockerId: string,
): Promise<void> {
  const route = itemTypeToRoute(itemType);
  await request<void>(`/${route}/${encodeURIComponent(itemId)}/dependencies`, {
    method: 'POST',
    body: JSON.stringify({ action: 'remove', blocker_id: blockerId } satisfies DependencyActionRequest),
  });
}

/** Bulk-set all blockers for an item (replaces existing) */
export async function setDependencies(
  itemType: DependencyItemType,
  itemId: string,
  blockerIds: string[],
): Promise<void> {
  const route = itemTypeToRoute(itemType);
  await request<void>(`/${route}/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ blocked_by: blockerIds }),
  });
}

/** Check if all blockers are resolved */
export async function checkReady(
  itemType: DependencyItemType,
  itemId: string,
): Promise<ReadyResponse> {
  const route = itemTypeToRoute(itemType);
  return request<ReadyResponse>(`/${route}/${encodeURIComponent(itemId)}/ready`);
}

// --- Search (used by DependencyPicker) ---

export async function searchItems(query: string): Promise<Array<Bug | FeatureRequest>> {
  const [bugs, frs] = await Promise.all([
    request<ListResponse<Bug>>(`/bugs?q=${encodeURIComponent(query)}`),
    request<ListResponse<FeatureRequest>>(`/feature-requests?q=${encodeURIComponent(query)}`),
  ]);
  return [...bugs.data, ...frs.data];
}
