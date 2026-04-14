// Verifies: FR-dependency-blocked-badge

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockedBadge } from '../../src/components/BlockedBadge';

describe('BlockedBadge', () => {
  // Verifies: FR-dependency-blocked-badge — renders nothing when not blocked (false)
  it('renders nothing when hasUnresolvedBlockers is false', () => {
    const { container } = render(<BlockedBadge hasUnresolvedBlockers={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Verifies: FR-dependency-blocked-badge — renders nothing when prop is undefined
  it('renders nothing when hasUnresolvedBlockers is undefined', () => {
    const { container } = render(<BlockedBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  // Verifies: FR-dependency-blocked-badge — renders red "Blocked" badge when true
  it('renders red Blocked badge when hasUnresolvedBlockers is true', () => {
    render(<BlockedBadge hasUnresolvedBlockers={true} />);
    const badge = screen.getByTestId('blocked-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Blocked');
  });
});
