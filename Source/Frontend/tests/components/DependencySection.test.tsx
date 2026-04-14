// Verifies: FR-dependency-section

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DependencySection } from '../../src/components/DependencySection';
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
    searchItems: vi.fn(),
    setDependencies: vi.fn(),
  },
}));

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-uuid-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Backlog,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

const blockerLink: DependencyLink = {
  blockedItemId: 'test-uuid-1',
  blockedItemDocId: 'WI-001',
  blockerItemId: 'blocker-id-1',
  blockerItemDocId: 'WI-010',
  createdAt: '2026-01-01T00:00:00Z',
};

const blocksLink: DependencyLink = {
  blockedItemId: 'blocked-id-1',
  blockedItemDocId: 'WI-020',
  blockerItemId: 'test-uuid-1',
  blockerItemDocId: 'WI-001',
  createdAt: '2026-01-01T00:00:00Z',
};

function renderSection(item: WorkItem, onRefresh = vi.fn()) {
  return render(
    <MemoryRouter>
      <DependencySection item={item} onRefresh={onRefresh} />
    </MemoryRouter>,
  );
}

describe('DependencySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-dependency-section — renders both subsections
  it('renders the dependency section with Blocked By and Blocks headings', () => {
    renderSection(makeWorkItem());
    expect(screen.getByTestId('dependency-section')).toBeInTheDocument();
    expect(screen.getByText(/Blocked By/i)).toBeInTheDocument();
    expect(screen.getByText(/^Blocks$/i)).toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — empty states shown when no dependencies
  it('shows no-blockers and no-blocks messages when arrays are empty', () => {
    renderSection(makeWorkItem({ blockedBy: [], blocks: [] }));
    expect(screen.getByTestId('no-blockers-msg')).toBeInTheDocument();
    expect(screen.getByTestId('no-blocks-msg')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — renders blockedBy chips with blockerItemDocId
  it('renders blocked-by chips showing blockerItemDocId', () => {
    const item = makeWorkItem({ blockedBy: [blockerLink] });
    renderSection(item);
    const chip = screen.getByTestId('blocker-chip-blocker-id-1');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('WI-010');
  });

  // Verifies: FR-dependency-section — renders blocks chips with blockedItemDocId
  it('renders blocks chips showing blockedItemDocId', () => {
    const item = makeWorkItem({ blocks: [blocksLink] });
    renderSection(item);
    const chip = screen.getByTestId('blocks-chip-blocked-id-1');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('WI-020');
  });

  // Verifies: FR-dependency-section — chip click navigates to blocker item
  it('navigates to the blocker item when a blocked-by chip is clicked', async () => {
    const user = userEvent.setup();
    const item = makeWorkItem({ blockedBy: [blockerLink] });
    renderSection(item);
    await user.click(screen.getByTestId('blocker-chip-blocker-id-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/blocker-id-1');
  });

  // Verifies: FR-dependency-section — chip click navigates to blocked item
  it('navigates to the blocked item when a blocks chip is clicked', async () => {
    const user = userEvent.setup();
    const item = makeWorkItem({ blocks: [blocksLink] });
    renderSection(item);
    await user.click(screen.getByTestId('blocks-chip-blocked-id-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/blocked-id-1');
  });

  // Verifies: FR-dependency-section — edit button visible for editable statuses
  it('shows Edit Dependencies button for non-terminal statuses', () => {
    renderSection(makeWorkItem({ status: WorkItemStatus.Backlog }));
    expect(screen.getByTestId('edit-dependencies-btn')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — edit button hidden for completed items
  it('hides Edit Dependencies button when status is completed', () => {
    renderSection(makeWorkItem({ status: WorkItemStatus.Completed }));
    expect(screen.queryByTestId('edit-dependencies-btn')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — edit button hidden for rejected items
  it('hides Edit Dependencies button when status is rejected', () => {
    renderSection(makeWorkItem({ status: WorkItemStatus.Rejected }));
    expect(screen.queryByTestId('edit-dependencies-btn')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — edit button opens picker modal
  it('opens DependencyPicker modal when Edit Dependencies is clicked', async () => {
    const user = userEvent.setup();
    renderSection(makeWorkItem());
    await user.click(screen.getByTestId('edit-dependencies-btn'));
    expect(screen.getByTestId('dependency-picker-modal')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — unresolved blockers highlights section with red border
  it('uses red border when hasUnresolvedBlockers is true', () => {
    const item = makeWorkItem({ hasUnresolvedBlockers: true });
    renderSection(item);
    const section = screen.getByTestId('dependency-section');
    expect(section).toHaveStyle({ border: '1px solid #ef4444' });
  });

  // Verifies: FR-dependency-section — unresolved warning text shown
  it('shows Unresolved warning text when hasUnresolvedBlockers is true', () => {
    renderSection(makeWorkItem({ hasUnresolvedBlockers: true }));
    expect(screen.getByText(/Unresolved/i)).toBeInTheDocument();
  });

  // Verifies: FR-dependency-section — no unresolved indicators for clean items
  it('does not show Unresolved warning when hasUnresolvedBlockers is false', () => {
    renderSection(makeWorkItem({ hasUnresolvedBlockers: false }));
    expect(screen.queryByText(/Unresolved/i)).not.toBeInTheDocument();
  });
});
