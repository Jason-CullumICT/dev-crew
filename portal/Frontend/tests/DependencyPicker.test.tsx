// Verifies: FR-0001 — DependencyPicker modal tests
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DependencyPicker } from '../src/components/shared/DependencyPicker'
import type { DependencyLink, BugReport, FeatureRequest } from '../../Shared/types'

vi.mock('../src/api/client', () => ({
  general: {
    searchItems: vi.fn(),
  },
  bugs: {
    update: vi.fn(),
  },
  featureRequests: {
    update: vi.fn(),
  },
}))

import { general, bugs, featureRequests } from '../src/api/client'

const mockSearchResults: Array<BugReport | FeatureRequest> = [
  {
    id: 'BUG-0001',
    title: 'Login fails on mobile',
    description: 'Users cannot log in',
    severity: 'high',
    status: 'reported',
    source_system: 'production',
    related_work_item_id: null,
    related_work_item_type: null,
    related_cycle_id: null,
    target_repo: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    blocked_by: [],
    blocks: [],
  } as BugReport,
  {
    id: 'FR-0002',
    title: 'Add dark mode',
    description: 'Support dark mode theme',
    source: 'manual',
    status: 'approved',
    priority: 'medium',
    votes: [],
    human_approval_comment: null,
    human_approval_approved_at: null,
    duplicate_warning: false,
    target_repo: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    blocked_by: [],
    blocks: [],
  } as FeatureRequest,
]

// Verifies: FR-0001 — item that would create a cycle
const cycleItem: BugReport = {
  id: 'BUG-0003',
  title: 'Cycle inducer',
  description: 'Would create a circular dependency',
  severity: 'medium',
  status: 'triaged',
  source_system: 'test',
  related_work_item_id: null,
  related_work_item_type: null,
  related_cycle_id: null,
  target_repo: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  blocked_by: [],
  blocks: [{ item_type: 'feature_request', item_id: 'FR-0010', title: 'Target FR', status: 'approved' }],
}

const defaultProps = {
  itemType: 'feature_request' as const,
  itemId: 'FR-0010',
  currentBlockedBy: [] as DependencyLink[],
  onClose: vi.fn(),
  onSave: vi.fn(),
}

describe('DependencyPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Verifies: FR-0001 — renders modal with search input
  it('renders the modal with search input and action buttons', () => {
    render(<DependencyPicker {...defaultProps} />)
    expect(screen.getByTestId('dependency-picker-modal')).toBeInTheDocument()
    expect(screen.getByTestId('dependency-search-input')).toBeInTheDocument()
    expect(screen.getByTestId('dependency-picker-cancel')).toBeInTheDocument()
    expect(screen.getByTestId('dependency-picker-save')).toBeInTheDocument()
  })

  // Verifies: FR-0001 — debounced search calls API
  it('searches items after debounce when query length >= 2', async () => {
    vi.mocked(general.searchItems).mockResolvedValue(mockSearchResults)
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'lo' } })

    await waitFor(() => {
      expect(general.searchItems).toHaveBeenCalledWith('lo')
    }, { timeout: 2000 })
  })

  // Verifies: FR-0001 — does not search for short queries
  it('does not search when query is shorter than 2 characters', async () => {
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'a' } })

    // Wait enough time for debounce to fire if it were going to
    await new Promise((r) => setTimeout(r, 400))
    expect(general.searchItems).not.toHaveBeenCalled()
  })

  // Verifies: FR-0001 — select and deselect items
  it('selects an item from search results', async () => {
    vi.mocked(general.searchItems).mockResolvedValue(mockSearchResults)
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'login' } })

    await waitFor(() => {
      expect(screen.getByTestId('search-result-BUG-0001')).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByTestId('search-result-BUG-0001'))

    expect(screen.getByTestId('selected-dependencies')).toBeInTheDocument()
    expect(screen.getByTestId('remove-dep-BUG-0001')).toBeInTheDocument()
  })

  // Verifies: FR-0001 — save calls featureRequests.update for FR items
  it('saves dependencies via featureRequests.update for feature request items', async () => {
    vi.mocked(featureRequests.update).mockResolvedValue({} as FeatureRequest)
    const onSave = vi.fn()

    render(
      <DependencyPicker
        {...defaultProps}
        currentBlockedBy={[
          { item_type: 'bug', item_id: 'BUG-0001', title: 'Login fails', status: 'reported' },
        ]}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByTestId('dependency-picker-save'))

    await waitFor(() => {
      expect(featureRequests.update).toHaveBeenCalledWith('FR-0010', {
        blocked_by: ['BUG-0001'],
      })
    })
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
  })

  // Verifies: FR-0001 — save calls bugs.update for bug items
  it('saves dependencies via bugs.update for bug items', async () => {
    vi.mocked(bugs.update).mockResolvedValue({} as BugReport)
    const onSave = vi.fn()

    render(
      <DependencyPicker
        {...defaultProps}
        itemType="bug"
        itemId="BUG-0010"
        currentBlockedBy={[
          { item_type: 'feature_request', item_id: 'FR-0001', title: 'Some FR', status: 'completed' },
        ]}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByTestId('dependency-picker-save'))

    await waitFor(() => {
      expect(bugs.update).toHaveBeenCalledWith('BUG-0010', {
        blocked_by: ['FR-0001'],
      })
    })
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
  })

  // Verifies: FR-0001 — client-side cycle detection guard
  it('shows error when selecting an item that would create a circular dependency', async () => {
    vi.mocked(general.searchItems).mockResolvedValue([cycleItem])
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'cycle' } })

    await waitFor(() => {
      expect(screen.getByTestId('search-result-BUG-0003')).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByTestId('search-result-BUG-0003'))

    expect(screen.getByTestId('dependency-picker-error')).toBeInTheDocument()
    expect(screen.getByTestId('dependency-picker-error').textContent).toContain('circular dependency')
  })

  // Verifies: FR-0001 — cancel closes modal
  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<DependencyPicker {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('dependency-picker-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  // Verifies: FR-0001 — overlay click closes modal
  it('calls onClose when clicking the overlay', () => {
    const onClose = vi.fn()
    render(<DependencyPicker {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('dependency-picker-modal'))
    expect(onClose).toHaveBeenCalled()
  })

  // Verifies: FR-0001 — shows existing blockers as pre-selected chips
  it('renders pre-selected blockers from currentBlockedBy', () => {
    render(
      <DependencyPicker
        {...defaultProps}
        currentBlockedBy={[
          { item_type: 'bug', item_id: 'BUG-0001', title: 'Existing blocker', status: 'reported' },
        ]}
      />
    )
    expect(screen.getByTestId('selected-dependencies')).toBeInTheDocument()
    expect(screen.getByTestId('remove-dep-BUG-0001')).toBeInTheDocument()
  })

  // Verifies: FR-0001 — remove chip from selected
  it('removes a selected dependency when remove button is clicked', () => {
    render(
      <DependencyPicker
        {...defaultProps}
        currentBlockedBy={[
          { item_type: 'bug', item_id: 'BUG-0001', title: 'Existing blocker', status: 'reported' },
        ]}
      />
    )

    fireEvent.click(screen.getByTestId('remove-dep-BUG-0001'))
    expect(screen.queryByTestId('remove-dep-BUG-0001')).not.toBeInTheDocument()
  })

  // Verifies: FR-0001 — handles search API error
  it('shows error when search API fails', async () => {
    vi.mocked(general.searchItems).mockRejectedValue(new Error('Network error'))
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByTestId('dependency-picker-error')).toBeInTheDocument()
      expect(screen.getByTestId('dependency-picker-error').textContent).toContain('Network error')
    }, { timeout: 2000 })
  })

  // Verifies: FR-0001 — handles save API error
  it('shows error when save fails', async () => {
    vi.mocked(featureRequests.update).mockRejectedValue(new Error('Save failed'))
    const onSave = vi.fn()

    render(
      <DependencyPicker
        {...defaultProps}
        currentBlockedBy={[
          { item_type: 'bug', item_id: 'BUG-0001', title: 'Blocker', status: 'reported' },
        ]}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByTestId('dependency-picker-save'))

    await waitFor(() => {
      expect(screen.getByTestId('dependency-picker-error')).toBeInTheDocument()
      expect(screen.getByTestId('dependency-picker-error').textContent).toContain('Save failed')
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  // Verifies: FR-0001 — filters out current item from results
  it('filters out the current item from search results', async () => {
    const selfItem: FeatureRequest = {
      id: 'FR-0010',
      title: 'Self item',
      description: '',
      source: 'manual',
      status: 'approved',
      priority: 'medium',
      votes: [],
      human_approval_comment: null,
      human_approval_approved_at: null,
      duplicate_warning: false,
      target_repo: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    vi.mocked(general.searchItems).mockResolvedValue([selfItem, ...mockSearchResults])
    render(<DependencyPicker {...defaultProps} />)

    fireEvent.change(screen.getByTestId('dependency-search-input'), { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByTestId('search-result-BUG-0001')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.queryByTestId('search-result-FR-0010')).not.toBeInTheDocument()
  })
})
