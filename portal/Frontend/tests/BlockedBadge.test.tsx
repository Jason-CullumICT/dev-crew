// Verifies: FR-dependency-list-ui — BlockedBadge component tests
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockedBadge } from '../src/components/shared/BlockedBadge'

describe('BlockedBadge', () => {
  // Verifies: FR-dependency-list-ui — red "Blocked" badge
  it('renders red Blocked badge when has unresolved blockers', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status="reported" />)
    expect(screen.getByTestId('badge-blocked')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-list-ui — amber "Pending Dependencies" badge
  it('renders amber Pending Dependencies badge when status is pending_dependencies', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status="pending_dependencies" />)
    expect(screen.getByTestId('badge-pending-dependencies')).toBeInTheDocument()
    expect(screen.getByText('Pending Dependencies')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-list-ui — pending_dependencies takes precedence over blocked
  it('shows Pending Dependencies over Blocked when both conditions are true', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status="pending_dependencies" />)
    expect(screen.queryByTestId('badge-blocked')).not.toBeInTheDocument()
    expect(screen.getByTestId('badge-pending-dependencies')).toBeInTheDocument()
  })

  // Verifies: FR-dependency-list-ui — returns null when no blockers
  it('renders nothing when no unresolved blockers and normal status', () => {
    const { container } = render(<BlockedBadge hasUnresolvedBlockers={false} status="reported" />)
    expect(container.innerHTML).toBe('')
  })

  // Verifies: FR-dependency-list-ui — returns null for resolved items without blockers
  it('renders nothing for resolved items without blockers', () => {
    const { container } = render(<BlockedBadge hasUnresolvedBlockers={false} status="resolved" />)
    expect(container.innerHTML).toBe('')
  })
})
