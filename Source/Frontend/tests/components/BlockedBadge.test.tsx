// Verifies: FR-dependency-ready-check (BlockedBadge component tests)

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockedBadge } from '../../src/components/BlockedBadge';
import { WorkItemStatus } from '../../../Shared/types/workflow';

describe('BlockedBadge', () => {
  // Verifies: FR-dependency-ready-check — renders Blocked badge when hasUnresolvedBlockers is true
  it('renders a "Blocked" badge when hasUnresolvedBlockers is true', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status={WorkItemStatus.Approved} />);
    expect(screen.getByTestId('blocked-badge')).toBeInTheDocument();
    expect(screen.getByTestId('blocked-badge')).toHaveTextContent('Blocked');
  });

  // Verifies: FR-dependency-ready-check — renders nothing when hasUnresolvedBlockers is false
  it('renders nothing when hasUnresolvedBlockers is false and status is normal', () => {
    render(<BlockedBadge hasUnresolvedBlockers={false} status={WorkItemStatus.Approved} />);
    expect(screen.queryByTestId('blocked-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-dependencies-badge')).not.toBeInTheDocument();
  });

  // Verifies: FR-dependency-dispatch-gating — renders pending-dependencies badge when status is pending
  it('renders "Pending Dependencies" badge when status is pending-dependencies', () => {
    render(<BlockedBadge hasUnresolvedBlockers={false} status={WorkItemStatus.PendingDependencies} />);
    expect(screen.getByTestId('pending-dependencies-badge')).toBeInTheDocument();
    expect(screen.getByTestId('pending-dependencies-badge')).toHaveTextContent('Pending Dependencies');
  });

  // Verifies: FR-dependency-dispatch-gating — shows both badges if both conditions met
  it('renders both badges when status is pending-dependencies AND hasUnresolvedBlockers is true', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status={WorkItemStatus.PendingDependencies} />);
    expect(screen.getByTestId('blocked-badge')).toBeInTheDocument();
    expect(screen.getByTestId('pending-dependencies-badge')).toBeInTheDocument();
  });

  // Verifies: FR-dependency-ready-check — Blocked badge has red styling cue
  it('Blocked badge has expected data-variant attribute for styling', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} status={WorkItemStatus.Approved} />);
    expect(screen.getByTestId('blocked-badge')).toHaveAttribute('data-variant', 'blocked');
  });

  // Verifies: FR-dependency-dispatch-gating — PendingDependencies badge has amber styling cue
  it('Pending Dependencies badge has expected data-variant attribute for styling', () => {
    render(<BlockedBadge hasUnresolvedBlockers={false} status={WorkItemStatus.PendingDependencies} />);
    expect(screen.getByTestId('pending-dependencies-badge')).toHaveAttribute('data-variant', 'pending');
  });
});
