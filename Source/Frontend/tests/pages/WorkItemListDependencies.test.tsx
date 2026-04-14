// Verifies: FR-dependency-ready-check (WorkItemListPage dependency badge tests)
// Verifies: FR-dependency-dispatch-gating (pending-dependencies status in list)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkItemListPage } from '../../src/pages/WorkItemListPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/api/client', () => ({
  workItemsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    route: vi.fn(),
    assess: vi.fn(),
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

const mockBlockedItem = {
  id: 'id-blocked',
  docId: 'WI-010',
  title: 'Blocked feature',
  description: 'This is blocked',
  type: 'feature',
  status: 'approved',
  priority: 'high',
  source: 'browser',
  assignedTeam: null,
  hasUnresolvedBlockers: true,
  blockedBy: [{ id: 'dep-1', blockerItemId: 'other-id', blockerTitle: 'Bug X', blockerStatus: 'in-progress', blockerItemType: 'bug', createdAt: '2026-01-01T00:00:00Z' }],
  blocks: [],
  changeHistory: [],
  assessments: [],
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-25T14:30:00Z',
};

const mockPendingItem = {
  id: 'id-pending',
  docId: 'WI-011',
  title: 'Pending dependencies feature',
  description: 'Waiting on deps',
  type: 'feature',
  status: 'pending-dependencies',
  priority: 'medium',
  source: 'browser',
  assignedTeam: null,
  hasUnresolvedBlockers: true,
  blockedBy: [],
  blocks: [],
  changeHistory: [],
  assessments: [],
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-25T14:30:00Z',
};

const mockNormalItem = {
  id: 'id-normal',
  docId: 'WI-001',
  title: 'Normal item',
  description: 'No blockers',
  type: 'feature',
  status: 'approved',
  priority: 'medium',
  source: 'browser',
  assignedTeam: null,
  hasUnresolvedBlockers: false,
  blockedBy: [],
  blocks: [],
  changeHistory: [],
  assessments: [],
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-25T14:30:00Z',
};

function renderListPage() {
  return render(
    <MemoryRouter>
      <WorkItemListPage />
    </MemoryRouter>,
  );
}

describe('WorkItemListPage — dependency badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-dependency-ready-check — Blocked badge shown for items with unresolved blockers
  it('shows Blocked badge for items with hasUnresolvedBlockers true', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockBlockedItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-id-blocked')).toBeInTheDocument();
    });
    const row = screen.getByTestId('work-item-row-id-blocked');
    expect(within(row).getByTestId('blocked-badge')).toBeInTheDocument();
    expect(within(row).getByTestId('blocked-badge')).toHaveTextContent('Blocked');
  });

  // Verifies: FR-dependency-ready-check — No Blocked badge for normal items
  it('does not show Blocked badge for items without unresolved blockers', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockNormalItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-id-normal')).toBeInTheDocument();
    });
    const row = screen.getByTestId('work-item-row-id-normal');
    expect(within(row).queryByTestId('blocked-badge')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-dispatch-gating — pending-dependencies status badge renders with amber color
  it('shows pending-dependencies status badge for items with pending-dependencies status', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockPendingItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-id-pending')).toBeInTheDocument();
    });
    const row = screen.getByTestId('work-item-row-id-pending');
    // The StatusBadge should render for pending-dependencies
    expect(within(row).getByTestId('status-badge')).toHaveTextContent('pending-dependencies');
  });

  // Verifies: FR-dependency-dispatch-gating — pending-dependencies item also shows pending-dependencies badge
  it('shows PendingDependencies badge for items with pending-dependencies status', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockPendingItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-id-pending')).toBeInTheDocument();
    });
    const row = screen.getByTestId('work-item-row-id-pending');
    expect(within(row).getByTestId('pending-dependencies-badge')).toBeInTheDocument();
  });
});
