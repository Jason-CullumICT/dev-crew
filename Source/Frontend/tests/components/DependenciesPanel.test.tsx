// Verifies: FR-dependency-linking (DependenciesPanel component tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DependenciesPanel } from '../../src/components/DependenciesPanel';
import { WorkItemType, WorkItemStatus } from '../../../Shared/types/workflow';
import type { DependencyLink } from '../../../Shared/types/workflow';

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

function makeLink(overrides: Partial<DependencyLink> = {}): DependencyLink {
  return {
    id: 'dep-001',
    blockerItemId: 'item-uuid-blocker',
    blockerItemType: WorkItemType.Bug,
    blockerTitle: 'Fix critical bug',
    blockerStatus: WorkItemStatus.InProgress,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderPanel(props: Parameters<typeof DependenciesPanel>[0]) {
  return render(
    <MemoryRouter>
      <DependenciesPanel {...props} />
    </MemoryRouter>,
  );
}

describe('DependenciesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-dependency-linking — panel renders with testid
  it('renders the dependencies panel container', () => {
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: [] });
    expect(screen.getByTestId('dependencies-panel')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-linking — "Blocked By" section heading shown
  it('renders Blocked By section heading', () => {
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: [] });
    expect(screen.getByText('Blocked By')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-linking — "Blocks" section heading shown
  it('renders Blocks section heading', () => {
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: [] });
    expect(screen.getByText('Blocks')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-linking — chips rendered for each blockedBy entry
  it('renders a chip for each blockedBy entry', () => {
    const links = [
      makeLink({ id: 'dep-1', blockerItemId: 'id-a', blockerTitle: 'Bug Alpha' }),
      makeLink({ id: 'dep-2', blockerItemId: 'id-b', blockerTitle: 'Bug Beta' }),
    ];
    renderPanel({ itemId: 'item-1', blockedBy: links, blocks: [] });
    const chips = screen.getAllByTestId('dependency-chip-blocked-by');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('Bug Alpha');
    expect(chips[1]).toHaveTextContent('Bug Beta');
  });

  // Verifies: FR-dependency-linking — chips rendered for each blocks entry
  it('renders a chip for each blocks entry', () => {
    const links = [
      makeLink({ id: 'dep-3', blockerItemId: 'id-c', blockerTitle: 'Feature Gamma' }),
    ];
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: links });
    const chips = screen.getAllByTestId('dependency-chip-blocks');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('Feature Gamma');
  });

  // Verifies: FR-dependency-linking — chip shows status badge
  it('each chip shows a status badge', () => {
    const link = makeLink({ blockerStatus: WorkItemStatus.Completed });
    renderPanel({ itemId: 'item-1', blockedBy: [link], blocks: [] });
    const chip = screen.getByTestId('dependency-chip-blocked-by');
    expect(within(chip).getByTestId('dep-status-badge')).toHaveTextContent('completed');
  });

  // Verifies: FR-dependency-linking — clicking a blockedBy chip navigates to detail page
  it('navigates to detail page when a blockedBy chip is clicked', async () => {
    const user = userEvent.setup();
    const link = makeLink({ blockerItemId: 'target-uuid-123' });
    renderPanel({ itemId: 'item-1', blockedBy: [link], blocks: [] });
    const chip = screen.getByTestId('dependency-chip-blocked-by');
    await user.click(chip);
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/target-uuid-123');
  });

  // Verifies: FR-dependency-linking — clicking a blocks chip navigates to detail page
  it('navigates to detail page when a blocks chip is clicked', async () => {
    const user = userEvent.setup();
    const link = makeLink({ blockerItemId: 'blocked-item-uuid' });
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: [link] });
    const chip = screen.getByTestId('dependency-chip-blocks');
    await user.click(chip);
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/blocked-item-uuid');
  });

  // Verifies: FR-dependency-linking — empty blockedBy renders gracefully
  it('shows "None" message when blockedBy is empty', () => {
    renderPanel({ itemId: 'item-1', blockedBy: [], blocks: [] });
    const panel = screen.getByTestId('dependencies-panel');
    expect(within(panel).getAllByText('None')).toHaveLength(2);
  });

  // Verifies: FR-dependency-ready-check — unresolved blockers highlighted when hasUnresolvedBlockers is true
  it('highlights unresolved blockers when hasUnresolvedBlockers is true', () => {
    const unresolvedLink = makeLink({ blockerStatus: WorkItemStatus.InProgress });
    renderPanel({
      itemId: 'item-1',
      blockedBy: [unresolvedLink],
      blocks: [],
      hasUnresolvedBlockers: true,
    });
    const chip = screen.getByTestId('dependency-chip-blocked-by');
    // unresolved blocker chips should be visually distinguished via data-unresolved attribute
    expect(chip).toHaveAttribute('data-unresolved', 'true');
  });

  // Verifies: FR-dependency-ready-check — resolved blockers not highlighted
  it('does not mark resolved blockers as unresolved', () => {
    const resolvedLink = makeLink({ blockerStatus: WorkItemStatus.Completed });
    renderPanel({
      itemId: 'item-1',
      blockedBy: [resolvedLink],
      blocks: [],
      hasUnresolvedBlockers: false,
    });
    const chip = screen.getByTestId('dependency-chip-blocked-by');
    expect(chip).toHaveAttribute('data-unresolved', 'false');
  });

  // Verifies: FR-dependency-linking — chip shows item type
  it('each chip shows the item type', () => {
    const link = makeLink({ blockerItemType: WorkItemType.Feature, blockerTitle: 'Feature X' });
    renderPanel({ itemId: 'item-1', blockedBy: [link], blocks: [] });
    const chip = screen.getByTestId('dependency-chip-blocked-by');
    expect(within(chip).getByTestId('dep-type-badge')).toHaveTextContent('feature');
  });
});
