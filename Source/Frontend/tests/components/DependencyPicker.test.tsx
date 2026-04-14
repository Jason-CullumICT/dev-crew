// Verifies: FR-dependency-picker

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DependencyPicker } from '../../src/components/DependencyPicker';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '../../../Shared/types/workflow';
import type { WorkItem, DependencyLink } from '../../../Shared/types/workflow';

vi.mock('../../src/api/client', () => ({
  workItemsApi: {
    searchItems: vi.fn(),
    setDependencies: vi.fn(),
  },
}));

import { workItemsApi } from '../../src/api/client';
const mockSearchItems = vi.mocked(workItemsApi.searchItems);
const mockSetDependencies = vi.mocked(workItemsApi.setDependencies);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'result-id-1',
    docId: 'WI-099',
    title: 'Another work item',
    description: 'A test item',
    type: WorkItemType.Bug,
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

const onSave = vi.fn();
const onClose = vi.fn();

const defaultProps = {
  currentItemId: 'current-id',
  currentItemDocId: 'WI-001',
  currentBlockedBy: [] as DependencyLink[],
  blocksItems: [] as DependencyLink[],
  onSave,
  onClose,
};

function renderPicker(props: Partial<typeof defaultProps> = {}) {
  return render(<DependencyPicker {...defaultProps} {...props} />);
}

describe('DependencyPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-dependency-picker — renders modal with search input
  it('renders the picker modal with search input and save/close buttons', () => {
    renderPicker();
    expect(screen.getByTestId('dependency-picker-modal')).toBeInTheDocument();
    expect(screen.getByTestId('dep-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('picker-save-btn')).toBeInTheDocument();
    expect(screen.getByTestId('picker-close-btn')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-picker — shows pre-selected blockers from currentBlockedBy
  it('pre-populates selected blockers from currentBlockedBy', () => {
    const link: DependencyLink = {
      blockedItemId: 'current-id',
      blockedItemDocId: 'WI-001',
      blockerItemId: 'blocker-1',
      blockerItemDocId: 'WI-010',
      createdAt: '2026-01-01T00:00:00Z',
    };
    renderPicker({ currentBlockedBy: [link] });
    expect(screen.getByTestId('selected-blocker-blocker-1')).toBeInTheDocument();
    expect(screen.getByTestId('selected-blocker-blocker-1')).toHaveTextContent('WI-010');
  });

  // Verifies: FR-dependency-picker — search returns results after 2+ chars
  it('shows search results when typing at least 2 characters', async () => {
    const user = userEvent.setup();
    const resultItem = makeWorkItem();
    mockSearchItems.mockResolvedValue({ data: [resultItem] });

    renderPicker();
    await user.type(screen.getByTestId('dep-search-input'), 'au');

    await waitFor(() => {
      expect(mockSearchItems).toHaveBeenCalledWith('au');
    });
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
    expect(screen.getByTestId('search-result-result-id-1')).toBeInTheDocument();
    expect(screen.getByText('WI-099')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-picker — no search for single character
  it('does not search when fewer than 2 characters are typed', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.type(screen.getByTestId('dep-search-input'), 'a');
    expect(mockSearchItems).not.toHaveBeenCalled();
  });

  // Verifies: FR-dependency-picker — can add item from search results
  it('adds an item to selected blockers when Add button is clicked', async () => {
    const user = userEvent.setup();
    const resultItem = makeWorkItem();
    mockSearchItems.mockResolvedValue({ data: [resultItem] });

    renderPicker();
    await user.type(screen.getByTestId('dep-search-input'), 'auth');

    await waitFor(() => {
      expect(screen.getByTestId('search-result-result-id-1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('selected-blocker-result-id-1')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-picker — can remove a selected blocker
  it('removes a selected blocker when the × button is clicked', async () => {
    const user = userEvent.setup();
    const link: DependencyLink = {
      blockedItemId: 'current-id',
      blockedItemDocId: 'WI-001',
      blockerItemId: 'blocker-1',
      blockerItemDocId: 'WI-010',
      createdAt: '2026-01-01T00:00:00Z',
    };
    renderPicker({ currentBlockedBy: [link] });

    expect(screen.getByTestId('selected-blocker-blocker-1')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Remove WI-010'));
    expect(screen.queryByTestId('selected-blocker-blocker-1')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-picker — client-side circular dependency guard
  it('shows circular dependency warning and blocks adding when item already blocked by this item', async () => {
    const user = userEvent.setup();
    const blockedItem = makeWorkItem({ id: 'blocked-id-1', docId: 'WI-020' });
    mockSearchItems.mockResolvedValue({ data: [blockedItem] });

    const blocksLinks: DependencyLink[] = [
      {
        blockedItemId: 'blocked-id-1',
        blockedItemDocId: 'WI-020',
        blockerItemId: 'current-id',
        blockerItemDocId: 'WI-001',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    renderPicker({ blocksItems: blocksLinks });
    await user.type(screen.getByTestId('dep-search-input'), 'WI-020');

    await waitFor(() => {
      expect(screen.getByTestId('search-result-blocked-id-1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add' }));

    // Warning shown, item NOT added
    expect(screen.getByTestId('circular-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-blocker-blocked-id-1')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-picker — save calls setDependencies with correct IDs
  it('calls setDependencies with selected blocker IDs on save', async () => {
    const user = userEvent.setup();
    const link: DependencyLink = {
      blockedItemId: 'current-id',
      blockedItemDocId: 'WI-001',
      blockerItemId: 'blocker-1',
      blockerItemDocId: 'WI-010',
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockSetDependencies.mockResolvedValue({ id: 'current-id' } as WorkItem);

    renderPicker({ currentBlockedBy: [link] });
    await user.click(screen.getByTestId('picker-save-btn'));

    await waitFor(() => {
      expect(mockSetDependencies).toHaveBeenCalledWith('current-id', ['blocker-1']);
    });
  });

  // Verifies: FR-dependency-picker — onSave callback called after successful save
  it('calls onSave callback after successful save', async () => {
    const user = userEvent.setup();
    const localOnSave = vi.fn();
    mockSetDependencies.mockResolvedValue({ id: 'current-id' } as WorkItem);

    renderPicker({ onSave: localOnSave });
    await user.click(screen.getByTestId('picker-save-btn'));

    await waitFor(() => {
      expect(localOnSave).toHaveBeenCalled();
    });
  });

  // Verifies: FR-dependency-picker — save error displayed when API fails
  it('shows save error when setDependencies API fails', async () => {
    const user = userEvent.setup();
    mockSetDependencies.mockRejectedValue(new Error('Save failed'));

    renderPicker();
    await user.click(screen.getByTestId('picker-save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('save-error')).toHaveTextContent('Save failed');
    });
  });

  // Verifies: FR-dependency-picker — close button calls onClose
  it('calls onClose when the × close button is clicked', async () => {
    const user = userEvent.setup();
    const localOnClose = vi.fn();
    renderPicker({ onClose: localOnClose });

    await user.click(screen.getByTestId('picker-close-btn'));
    expect(localOnClose).toHaveBeenCalled();
  });

  // Verifies: FR-dependency-picker — Cancel button calls onClose
  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const localOnClose = vi.fn();
    renderPicker({ onClose: localOnClose });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(localOnClose).toHaveBeenCalled();
  });
});
