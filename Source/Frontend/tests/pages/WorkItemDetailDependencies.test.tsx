// Verifies: FR-dependency-dispatch-gating (WorkItemDetailPage dependency-blocking tests)
// Verifies: FR-dependency-linking (dependency panel integration in detail page)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkItemDetailPage } from '../../src/pages/WorkItemDetailPage';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';
import type { WorkItem, DependencyLink } from '../../../Shared/types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/api/client', () => ({
  workItemsApi: {
    getById: vi.fn(),
    route: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    dispatch: vi.fn(),
  },
  dependenciesApi: {
    addDependency: vi.fn(),
    removeDependency: vi.fn(),
    checkReady: vi.fn(),
  },
  dashboardApi: {
    summary: vi.fn(),
    activity: vi.fn(),
    queue: vi.fn(),
  },
}));

import { workItemsApi } from '../../src/api/client';
const mockGetById = vi.mocked(workItemsApi.getById);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-uuid-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Approved,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function makeLink(overrides: Partial<DependencyLink> = {}): DependencyLink {
  return {
    id: 'dep-001',
    blockerItemId: 'blocker-uuid',
    blockerItemType: WorkItemType.Bug,
    blockerTitle: 'Fix login bug',
    blockerStatus: WorkItemStatus.InProgress,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderPage(id = 'test-uuid-1') {
  return render(
    <MemoryRouter initialEntries={[`/work-items/${id}`]}>
      <Routes>
        <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkItemDetailPage — dependency features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-dependency-linking — dependencies panel shown when item has blockedBy links
  it('shows dependencies panel when item has blockedBy entries', async () => {
    const item = makeWorkItem({
      blockedBy: [makeLink()],
      blocks: [],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('dependencies-panel')).toBeInTheDocument();
    });
  });

  // Verifies: FR-dependency-linking — dependencies panel shown when item has blocks links
  it('shows dependencies panel when item has blocks entries', async () => {
    const item = makeWorkItem({
      blockedBy: [],
      blocks: [makeLink()],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('dependencies-panel')).toBeInTheDocument();
    });
  });

  // Verifies: FR-dependency-linking — dependencies panel hidden when both arrays are empty
  it('hides dependencies panel when both blockedBy and blocks are empty', async () => {
    const item = makeWorkItem({ blockedBy: [], blocks: [] });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('dependencies-panel')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-linking — dependencies panel hidden when arrays are undefined
  it('hides dependencies panel when blockedBy and blocks are undefined', async () => {
    const item = makeWorkItem();
    // no blockedBy or blocks properties
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('dependencies-panel')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-dispatch-gating — dispatch button disabled when hasUnresolvedBlockers
  it('disables dispatch button when item has unresolved blockers', async () => {
    const item = makeWorkItem({
      status: WorkItemStatus.Approved,
      hasUnresolvedBlockers: true,
      blockedBy: [makeLink({ blockerStatus: WorkItemStatus.InProgress })],
      blocks: [],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-dispatch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-dispatch')).toBeDisabled();
  });

  // Verifies: FR-dependency-dispatch-gating — dispatch button enabled when no unresolved blockers
  it('enables dispatch button when item has no unresolved blockers', async () => {
    const item = makeWorkItem({
      status: WorkItemStatus.Approved,
      hasUnresolvedBlockers: false,
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-dispatch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-dispatch')).not.toBeDisabled();
  });

  // Verifies: FR-dependency-dispatch-gating — blocker warning shown when hasUnresolvedBlockers
  it('shows blocker warning message when dispatch is blocked', async () => {
    const item = makeWorkItem({
      status: WorkItemStatus.Approved,
      hasUnresolvedBlockers: true,
      blockedBy: [makeLink()],
      blocks: [],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('unresolved-blockers-warning')).toBeInTheDocument();
    });
  });

  // Verifies: FR-dependency-dispatch-gating — no warning when no unresolved blockers
  it('does not show blocker warning when hasUnresolvedBlockers is false', async () => {
    const item = makeWorkItem({
      status: WorkItemStatus.Approved,
      hasUnresolvedBlockers: false,
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-dispatch')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('unresolved-blockers-warning')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-dispatch-gating — pending-dependencies status shows no dispatch
  it('shows no dispatch button when status is pending-dependencies', async () => {
    const item = makeWorkItem({
      status: WorkItemStatus.PendingDependencies,
    });
    mockGetById.mockResolvedValue(item);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('action-dispatch')).not.toBeInTheDocument();
  });
});
