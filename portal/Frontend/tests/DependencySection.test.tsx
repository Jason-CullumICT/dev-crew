// Verifies: FR-dependency-detail-ui — DependencySection component tests
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DependencySection } from '../src/components/shared/DependencySection'
import type { DependencyLink } from '../../Shared/types'

vi.mock('../src/api/client', () => ({
  general: { searchItems: vi.fn().mockResolvedValue([]) },
  bugs: { update: vi.fn() },
  featureRequests: { update: vi.fn() },
}))

const resolvedBlocker: DependencyLink = {
  item_type: 'bug',
  item_id: 'BUG-0001',
  title: 'Fixed bug',
  status: 'resolved',
}

const unresolvedBlocker: DependencyLink = {
  item_type: 'feature_request',
  item_id: 'FR-0002',
  title: 'Pending feature',
  status: 'approved',
}

const blocksItem: DependencyLink = {
  item_type: 'bug',
  item_id: 'BUG-0005',
  title: 'Downstream bug',
  status: 'reported',
}

describe('DependencySection', () => {
  // Verifies: FR-dependency-detail-ui — renders section container
  it('renders the dependency section', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    expect(screen.getByTestId('dependency-section')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — empty state messages
  it('shows empty state messages when no dependencies', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    expect(screen.getByText('No blockers')).toBeInTheDocument()
    expect(screen.getByText('Does not block any items')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — renders blocked-by chips with status
  it('renders blocked-by chips with item ID and status', () => {
    render(
      <DependencySection
        blockedBy={[resolvedBlocker, unresolvedBlocker]}
        blocks={[]}
        itemType="feature_request"
        itemId="FR-0010"
        editable={false}
      />
    )
    expect(screen.getByTestId('dependency-chip-BUG-0001')).toBeInTheDocument()
    expect(screen.getByTestId('dependency-chip-FR-0002')).toBeInTheDocument()
    expect(screen.getByText('[BUG-0001]')).toBeInTheDocument()
    expect(screen.getByText('Fixed bug')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — renders blocks chips
  it('renders blocks section with chips', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[blocksItem]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    expect(screen.getByTestId('dependency-chip-BUG-0005')).toBeInTheDocument()
    expect(screen.getByText('Downstream bug')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — resolved status shows checkmark
  it('shows checkmark for resolved blockers', () => {
    render(
      <DependencySection
        blockedBy={[resolvedBlocker]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    const chip = screen.getByTestId('dependency-chip-BUG-0001')
    expect(chip.textContent).toContain('✓')
  })

  // Verifies: FR-dependency-detail-ui — pending_dependencies warning banner
  it('shows pending dependencies warning when status is pending_dependencies', () => {
    render(
      <DependencySection
        blockedBy={[unresolvedBlocker]}
        blocks={[]}
        itemType="feature_request"
        itemId="FR-0010"
        editable={false}
        status="pending_dependencies"
      />
    )
    expect(screen.getByTestId('pending-deps-warning')).toBeInTheDocument()
    expect(screen.getByText(/Dispatch blocked/)).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — no warning when status is not pending_dependencies
  it('does not show warning when status is not pending_dependencies', () => {
    render(
      <DependencySection
        blockedBy={[unresolvedBlocker]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
        status="reported"
      />
    )
    expect(screen.queryByTestId('pending-deps-warning')).not.toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — edit button shown when editable
  it('shows Edit Dependencies button when editable is true', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={true}
      />
    )
    expect(screen.getByTestId('edit-dependencies-btn')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — edit button hidden when not editable
  it('hides Edit Dependencies button when editable is false', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    expect(screen.queryByTestId('edit-dependencies-btn')).not.toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — opens picker on edit click
  it('opens DependencyPicker modal when Edit Dependencies is clicked', () => {
    render(
      <DependencySection
        blockedBy={[]}
        blocks={[]}
        itemType="bug"
        itemId="BUG-0010"
        editable={true}
      />
    )
    fireEvent.click(screen.getByTestId('edit-dependencies-btn'))
    expect(screen.getByTestId('dependency-picker-modal')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-detail-ui — chips are clickable links
  it('renders dependency chips as links with correct href', () => {
    render(
      <DependencySection
        blockedBy={[resolvedBlocker]}
        blocks={[{ item_type: 'feature_request', item_id: 'FR-0003', title: 'Some FR', status: 'approved' }]}
        itemType="bug"
        itemId="BUG-0010"
        editable={false}
      />
    )
    const bugChip = screen.getByTestId('dependency-chip-BUG-0001')
    expect(bugChip.getAttribute('href')).toBe('/bugs/BUG-0001')
    const frChip = screen.getByTestId('dependency-chip-FR-0003')
    expect(frChip.getAttribute('href')).toBe('/feature-requests/FR-0003')
  })
})
