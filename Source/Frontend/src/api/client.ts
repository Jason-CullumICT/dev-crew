// Verifies: FR-WF-010, FR-WF-011 (API client for work item operations)
// Verifies: FR-dependency-linking (dependenciesApi client functions)

import type {
  WorkItem,
  PaginatedWorkItemsResponse,
  WorkItemFilters,
  PaginationParams,
  DashboardSummaryResponse,
  DashboardActivityResponse,
  DashboardQueueResponse,
  CreateWorkItemRequest,
  RejectWorkItemRequest,
  DispatchWorkItemRequest,
  AddDependencyRequest,
  DependenciesResponse,
  DependencyReadyResponse,
} from '../../../Shared/types/workflow';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const workItemsApi = {
  list(filters: WorkItemFilters & PaginationParams = {}): Promise<PaginatedWorkItemsResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return request(`/work-items${qs ? `?${qs}` : ''}`);
  },

  getById(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}`);
  },

  create(data: CreateWorkItemRequest): Promise<WorkItem> {
    return request('/work-items', { method: 'POST', body: JSON.stringify(data) });
  },

  route(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/route`, { method: 'POST' });
  },

  assess(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/assess`, { method: 'POST' });
  },

  approve(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/approve`, { method: 'POST' });
  },

  reject(id: string, data: RejectWorkItemRequest): Promise<WorkItem> {
    return request(`/work-items/${id}/reject`, { method: 'POST', body: JSON.stringify(data) });
  },

  dispatch(id: string, data: DispatchWorkItemRequest): Promise<WorkItem> {
    return request(`/work-items/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) });
  },
};

// Verifies: FR-dependency-linking — typed API functions for dependency endpoints
export const dependenciesApi = {
  addDependency(itemId: string, data: AddDependencyRequest): Promise<DependenciesResponse> {
    return request(`/work-items/${itemId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeDependency(itemId: string, blockerItemId: string): Promise<void> {
    return request(`/work-items/${itemId}/dependencies/${blockerItemId}`, {
      method: 'DELETE',
    });
  },

  checkReady(itemId: string): Promise<DependencyReadyResponse> {
    return request(`/work-items/${itemId}/ready`);
  },
};

export const dashboardApi = {
  summary(): Promise<DashboardSummaryResponse> {
    return request('/dashboard/summary');
  },

  activity(): Promise<DashboardActivityResponse> {
    return request('/dashboard/activity');
  },

  queue(): Promise<DashboardQueueResponse> {
    return request('/dashboard/queue');
  },
};
